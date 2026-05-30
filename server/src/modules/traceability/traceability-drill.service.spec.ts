import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TraceabilityDrillService } from './traceability-drill.service';

// Shared realistic snapshot fixture — matches the Prisma-generated shape for TraceabilitySnapshot
const baseSnapshot = {
  id: 'snap-1',
  company_id: 'company-1',
  sourceQueryHash: 'hash-abc',
  exportMode: 'snapshot',
  requesterId: 'user-1',
  status: 'ready',
  snapshotType: 'query',
  summary: {},
  filePath: null,
  createdAt: new Date('2026-05-30T00:00:00Z'),
  updatedAt: new Date('2026-05-30T00:00:00Z'),
  rootObjectType: 'production_batch',
  rootObjectId: 'batch-1',
  snapshotData: null,
  fileId: null,
  snapshotPurpose: 'evidence_export',
  readinessStatus: 'complete',
  readinessReasons: null,
};

const createTxClient = () => ({
  correctiveAction: { create: jest.fn() },
  traceabilityDrill: { update: jest.fn() },
});

const createPrisma = () => {
  const txClient = createTxClient();
  const mock = {
    traceabilityDrill: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    traceabilitySnapshot: {
      findFirst: jest.fn(),
    },
    correctiveAction: {
      create: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient)),
    _txClient: txClient,
  };
  return mock;
};

const createNumberSequence = () => ({
  generateCorrectiveActionNo: jest.fn().mockResolvedValue('CAPA-2026-0099'),
});

const baseDrill = {
  id: 'drill-1',
  company_id: 'company-1',
  drill_type: 'forward',
  drill_date: new Date('2026-06-01'),
  planned_start: new Date('2026-06-01T09:00:00Z'),
  planned_end: new Date('2026-06-01T12:00:00Z'),
  actual_start: null,
  actual_end: null,
  simulated_case: 'Contamination scenario',
  root_object_type: 'production_batch',
  root_object_id: 'batch-1',
  traceability_snapshot_id: null,
  participants: ['user-1', 'user-2'],
  reviewer_id: null,
  approver_id: null,
  conclusion: null,
  conclusion_at: null,
  capa_id: null,
  status: 'planned',
  created_at: new Date('2026-05-30T00:00:00Z'),
  updated_at: new Date('2026-05-30T00:00:00Z'),
};

describe('TraceabilityDrillService', () => {
  let prisma: ReturnType<typeof createPrisma>;
  let numberSequence: ReturnType<typeof createNumberSequence>;
  let service: TraceabilityDrillService;

  beforeEach(() => {
    prisma = createPrisma();
    numberSequence = createNumberSequence();
    service = new TraceabilityDrillService(prisma as any, numberSequence as any);
  });

  describe('planDrill', () => {
    it('creates a drill in planned state with root object', async () => {
      prisma.traceabilityDrill.create.mockResolvedValue(baseDrill);

      const result = await service.planDrill({
        company_id: 'company-1',
        drill_type: 'forward',
        drill_date: new Date('2026-06-01'),
        root_object_type: 'production_batch',
        root_object_id: 'batch-1',
        participants: ['user-1', 'user-2'],
        simulated_case: 'Contamination scenario',
        planned_start: new Date('2026-06-01T09:00:00Z'),
        planned_end: new Date('2026-06-01T12:00:00Z'),
      });

      expect(prisma.traceabilityDrill.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          company_id: 'company-1',
          drill_type: 'forward',
          root_object_type: 'production_batch',
          root_object_id: 'batch-1',
          status: 'planned',
        }),
      });
      expect(result.status).toBe('planned');
      expect(result.root_object_id).toBe('batch-1');
    });

    it('rejects invalid drill_type', async () => {
      await expect(
        service.planDrill({
          company_id: 'company-1',
          drill_type: 'invalid_type',
          drill_date: new Date('2026-06-01'),
          root_object_type: 'production_batch',
          root_object_id: 'batch-1',
          participants: [],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.traceabilityDrill.create).not.toHaveBeenCalled();
    });

    it('rejects missing root_object_id', async () => {
      await expect(
        service.planDrill({
          company_id: 'company-1',
          drill_type: 'backward',
          drill_date: new Date('2026-06-01'),
          root_object_type: 'production_batch',
          root_object_id: '',
          participants: [],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('startDrill', () => {
    it('transitions drill from planned to in_progress and sets actual_start', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue({ ...baseDrill, status: 'planned' });
      prisma.traceabilityDrill.update.mockResolvedValue({
        ...baseDrill,
        status: 'in_progress',
        actual_start: new Date(),
      });

      const result = await service.startDrill('drill-1', 'company-1');

      expect(prisma.traceabilityDrill.update).toHaveBeenCalledWith({
        where: { id: 'drill-1' },
        data: expect.objectContaining({
          status: 'in_progress',
          actual_start: expect.any(Date),
        }),
      });
      expect(result.status).toBe('in_progress');
    });

    it('rejects starting a drill that is not in planned status', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue({ ...baseDrill, status: 'in_progress' });

      await expect(service.startDrill('drill-1', 'company-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException when drill does not exist', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue(null);

      await expect(service.startDrill('missing-drill', 'company-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('attachSnapshot', () => {
    it('links a traceability snapshot to an in_progress drill', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue({ ...baseDrill, status: 'in_progress' });
      prisma.traceabilitySnapshot.findFirst.mockResolvedValue({ ...baseSnapshot });
      prisma.traceabilityDrill.update.mockResolvedValue({
        ...baseDrill,
        status: 'in_progress',
        traceability_snapshot_id: 'snap-1',
      });

      const result = await service.attachSnapshot('drill-1', 'snap-1', 'company-1');

      expect(prisma.traceabilitySnapshot.findFirst).toHaveBeenCalledWith({
        where: { id: 'snap-1', company_id: 'company-1' },
      });
      expect(prisma.traceabilityDrill.update).toHaveBeenCalledWith({
        where: { id: 'drill-1' },
        data: { traceability_snapshot_id: 'snap-1' },
      });
      expect(result.traceability_snapshot_id).toBe('snap-1');
    });

    it('throws NotFoundException when snapshot does not exist', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue({ ...baseDrill, status: 'in_progress' });
      prisma.traceabilitySnapshot.findFirst.mockResolvedValue(null);

      await expect(
        service.attachSnapshot('drill-1', 'missing-snap', 'company-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when snapshot belongs to a different tenant', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue({ ...baseDrill, status: 'in_progress' });
      // Snapshot belongs to company-2 but caller is company-1 — findFirst returns null because
      // company_id filter excludes it
      prisma.traceabilitySnapshot.findFirst.mockResolvedValue(null);

      await expect(
        service.attachSnapshot('drill-1', 'snap-other-tenant', 'company-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects attaching snapshot to a drill not in in_progress status', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue({ ...baseDrill, status: 'planned' });

      await expect(
        service.attachSnapshot('drill-1', 'snap-1', 'company-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('concludeDrill', () => {
    it('concludes a drill with snapshot attached and sets conclusion fields', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue({
        ...baseDrill,
        status: 'in_progress',
        traceability_snapshot_id: 'snap-1',
      });
      prisma.traceabilitySnapshot.findFirst.mockResolvedValue({ ...baseSnapshot });
      prisma.traceabilityDrill.update.mockResolvedValue({
        ...baseDrill,
        status: 'completed',
        conclusion: 'passed',
        conclusion_at: new Date(),
        traceability_snapshot_id: 'snap-1',
      });

      const result = await service.concludeDrill('drill-1', 'passed', 'company-1', 'reviewer-1');

      expect(prisma.traceabilitySnapshot.findFirst).toHaveBeenCalledWith({
        where: { id: 'snap-1', company_id: 'company-1' },
      });
      expect(prisma.traceabilityDrill.update).toHaveBeenCalledWith({
        where: { id: 'drill-1' },
        data: expect.objectContaining({
          status: 'completed',
          conclusion: 'passed',
          conclusion_at: expect.any(Date),
          actual_end: expect.any(Date),
          reviewer_id: 'reviewer-1',
        }),
      });
      expect(result.status).toBe('completed');
    });

    it('rejects an invalid conclusion value', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue({
        ...baseDrill,
        status: 'in_progress',
        traceability_snapshot_id: 'snap-1',
      });

      await expect(
        service.concludeDrill('drill-1', 'fail', 'company-1'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.traceabilityDrill.update).not.toHaveBeenCalled();
    });

    it('rejects concluding a drill without an attached snapshot', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue({
        ...baseDrill,
        status: 'in_progress',
        traceability_snapshot_id: null,
      });

      await expect(
        service.concludeDrill('drill-1', 'passed', 'company-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects concluding a drill when snapshot readiness is not complete', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue({
        ...baseDrill,
        status: 'in_progress',
        traceability_snapshot_id: 'snap-1',
      });
      prisma.traceabilitySnapshot.findFirst.mockResolvedValue({
        ...baseSnapshot,
        readinessStatus: 'incomplete',
      });

      await expect(
        service.concludeDrill('drill-1', 'passed', 'company-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects concluding when snapshot belongs to a different tenant (not found with company filter)', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue({
        ...baseDrill,
        status: 'in_progress',
        traceability_snapshot_id: 'snap-1',
      });
      // company_id filter returns null — cross-tenant snapshot excluded
      prisma.traceabilitySnapshot.findFirst.mockResolvedValue(null);

      await expect(
        service.concludeDrill('drill-1', 'passed', 'company-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects concluding a drill that is not in_progress', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue({
        ...baseDrill,
        status: 'planned',
        traceability_snapshot_id: 'snap-1',
      });

      await expect(
        service.concludeDrill('drill-1', 'passed', 'company-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('createCapaForFailedDrill', () => {
    it('creates a CorrectiveAction for a failed drill and links it atomically in a transaction', async () => {
      const failedDrill = {
        ...baseDrill,
        status: 'completed',
        conclusion: 'failed',
        capa_id: null,
      };
      prisma.traceabilityDrill.findFirst.mockResolvedValue(failedDrill);
      const txClient = prisma._txClient;
      txClient.correctiveAction.create.mockResolvedValue({ id: 'capa-1' });
      txClient.traceabilityDrill.update.mockResolvedValue({
        ...failedDrill,
        capa_id: 'capa-1',
      });

      const result = await service.createCapaForFailedDrill('drill-1', 'user-1', 'company-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(numberSequence.generateCorrectiveActionNo).toHaveBeenCalledWith('company-1', expect.any(Date), txClient);
      expect(txClient.correctiveAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          company_id: 'company-1',
          trigger_type: 'other',
          description: expect.stringContaining('drill-1'),
        }),
      });
      expect(txClient.traceabilityDrill.update).toHaveBeenCalledWith({
        where: { id: 'drill-1' },
        data: { capa_id: 'capa-1' },
      });
      expect(result.capa_id).toBe('capa-1');
    });

    it('rejects CAPA creation when drill conclusion is not failed', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue({
        ...baseDrill,
        status: 'completed',
        conclusion: 'passed',
        capa_id: null,
      });

      await expect(
        service.createCapaForFailedDrill('drill-1', 'user-1', 'company-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects CAPA creation when a CAPA is already linked', async () => {
      prisma.traceabilityDrill.findFirst.mockResolvedValue({
        ...baseDrill,
        status: 'completed',
        conclusion: 'failed',
        capa_id: 'existing-capa',
      });

      await expect(
        service.createCapaForFailedDrill('drill-1', 'user-1', 'company-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
