/**
 * Phase 15 Task 3 — Training Record Convergence
 *
 * The UI label "培训记录" maps to an alias response composed from
 * LearningRecord + TrainingProject + TrainingArchive.
 * No separate TrainingRecord Prisma model is created.
 *
 * Alias shape:
 * {
 *   trainingProjectId,
 *   learningRecordId,
 *   archiveId,
 *   participantId,
 *   completedAt,
 *   result,    // 'passed' | 'failed' | 'in_progress'
 * }
 */
import { RecordService } from './record.service';

function freshService(overrides: {
  learningRecords?: any[];
  archive?: any;
  project?: any;
} = {}) {
  const learningRecords = overrides.learningRecords ?? [];
  const archive = overrides.archive ?? null;
  const project = overrides.project ?? { id: 'proj-1', title: 'T', archive };

  const prisma: any = {
    learningRecord: {
      findMany: jest.fn().mockResolvedValue(learningRecords),
    },
    trainingProject: {
      findUnique: jest.fn().mockResolvedValue(project),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { svc: new RecordService(prisma), prisma };
}

describe('RecordService.listTrainingRecordAliases', () => {
  it('returns alias shape with trainingProjectId, learningRecordId, archiveId', async () => {
    const archive = { id: 'arch-1' };
    const project = { id: 'proj-1', title: 'T', archive };
    const learningRecords = [
      {
        id: 'lr-1',
        projectId: 'proj-1',
        userId: 'u-1',
        passed: true,
        completedAt: new Date('2026-01-10'),
      },
    ];

    const { svc, prisma } = freshService({ learningRecords, archive, project });
    prisma.trainingProject.findUnique.mockResolvedValue(project);
    prisma.learningRecord.findMany.mockResolvedValue(learningRecords);

    const result = await svc.listTrainingRecordAliases('proj-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      trainingProjectId: 'proj-1',
      learningRecordId: 'lr-1',
      archiveId: 'arch-1',
      participantId: 'u-1',
      completedAt: new Date('2026-01-10'),
      result: 'passed',
    });
  });

  it('sets result to "failed" when passed=false and completedAt is set', async () => {
    const project = { id: 'proj-1', title: 'T', archive: null };
    const learningRecords = [
      {
        id: 'lr-2',
        projectId: 'proj-1',
        userId: 'u-2',
        passed: false,
        completedAt: new Date('2026-01-12'),
      },
    ];
    const { svc, prisma } = freshService({ learningRecords, project });
    prisma.trainingProject.findUnique.mockResolvedValue(project);
    prisma.learningRecord.findMany.mockResolvedValue(learningRecords);

    const result = await svc.listTrainingRecordAliases('proj-1');

    expect(result[0].result).toBe('failed');
    expect(result[0].archiveId).toBeNull();
  });

  it('sets result to "in_progress" when completedAt is null', async () => {
    const project = { id: 'proj-1', title: 'T', archive: null };
    const learningRecords = [
      {
        id: 'lr-3',
        projectId: 'proj-1',
        userId: 'u-3',
        passed: false,
        completedAt: null,
      },
    ];
    const { svc, prisma } = freshService({ learningRecords, project });
    prisma.trainingProject.findUnique.mockResolvedValue(project);
    prisma.learningRecord.findMany.mockResolvedValue(learningRecords);

    const result = await svc.listTrainingRecordAliases('proj-1');

    expect(result[0].result).toBe('in_progress');
  });

  it('returns empty array when no learning records exist for project', async () => {
    const project = { id: 'proj-1', title: 'T', archive: null };
    const { svc, prisma } = freshService({ learningRecords: [], project });
    prisma.trainingProject.findUnique.mockResolvedValue(project);
    prisma.learningRecord.findMany.mockResolvedValue([]);

    const result = await svc.listTrainingRecordAliases('proj-1');

    expect(result).toHaveLength(0);
  });

  it('throws NotFoundException when project does not exist', async () => {
    const { svc, prisma } = freshService();
    prisma.trainingProject.findUnique.mockResolvedValue(null);

    await expect(svc.listTrainingRecordAliases('ghost')).rejects.toMatchObject({
      message: '培训项目不存在',
    });
  });
});

describe('Training module does not expose /training-records route', () => {
  it('RecordController path is training/records (not /training-records)', async () => {
    const { RecordController } = await import('./record.controller');
    const metadata = Reflect.getMetadata('path', RecordController);
    expect(metadata).toBe('training/records');
  });

  it('RecordController has no GET endpoint named training-records', async () => {
    const { RecordController } = await import('./record.controller');
    // Confirm the controller path does NOT start with standalone "training-records"
    const path = Reflect.getMetadata('path', RecordController);
    expect(path).not.toBe('training-records');
  });
});
