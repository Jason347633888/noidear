import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OwnershipContext } from '../module-access/ownership-context';
import { userIdsInDepts } from '../module-access/ownership-helpers';

export interface TrainingRecordAlias {
  trainingProjectId: string;
  learningRecordId: string;
  archiveId: string | null;
  participantId: string;
  completedAt: Date | null;
  result: 'passed' | 'failed' | 'in_progress';
}

@Injectable()
export class RecordService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(ownership: OwnershipContext, projectId?: string) {
    // If projectId is given and caller is the project trainer, bypass ownership filter
    if (projectId) {
      const project = await this.prisma.trainingProject.findUnique({ where: { id: projectId } });
      if (project && project.trainerId === ownership.userId) {
        return this.fetchRecordsWithUser({ projectId }, { createdAt: 'desc' });
      }
    }

    const ownershipWhere = await this.buildOwnershipWhere(ownership);
    const where: Record<string, unknown> = { ...ownershipWhere };
    if (projectId) {
      where['projectId'] = projectId;
    }
    return this.fetchRecordsWithUser(where, { createdAt: 'desc' });
  }

  /**
   * LearningRecord 没有直接关联到 User（无 Prisma relation），
   * 手动补全 user 字段以供前端 LearningRecordTable 使用。
   */
  private async fetchRecordsWithUser(
    where: Record<string, unknown>,
    orderBy: Record<string, unknown>,
  ) {
    const records = await this.prisma.learningRecord.findMany({ where, orderBy });
    if (records.length === 0) return records;

    const userIds = [...new Set(records.map((r) => r.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, name: true, department: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return records.map((r) => ({ ...r, user: userMap.get(r.userId) ?? null }));
  }

  private async buildOwnershipWhere(ownership: OwnershipContext): Promise<Record<string, unknown>> {
    if (ownership.roleCode === 'admin') return {};
    if (ownership.roleCode === 'user') {
      return { userId: ownership.userId };
    }
    // leader
    const memberIds = await userIdsInDepts(this.prisma, ownership.managedDepartmentIds);
    if (memberIds.length === 0) return { id: 'no-match' };
    return { userId: { in: memberIds } };
  }

  /**
   * 查询项目学习记录
   * 权限：培训讲师可查看项目记录
   */
  async findProjectRecords(projectId: string, userId: string) {
    const project = await this.getProjectById(projectId);

    // 权限校验：只有培训讲师可以查看项目记录
    if (project.trainerId !== userId) {
      throw new ForbiddenException('只有培训讲师可以查看项目学习记录');
    }

    const records = await this.prisma.learningRecord.findMany({
      where: { projectId },
      include: {
        examRecords: {
          orderBy: { submittedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 获取学员信息
    const userIds = records.map(r => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        name: true,
        department: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // 组合学员信息
    const recordsWithUser = records.map(record => ({
      ...record,
      user: userMap.get(record.userId),
    }));

    return recordsWithUser;
  }

  /**
   * 查询我的学习记录
   */
  async findMyRecords(userId: string) {
    const records = await this.prisma.learningRecord.findMany({
      where: { userId },
      include: {
        project: {
          include: {
            plan: {
              select: { year: true, title: true },
            },
          },
        },
        examRecords: {
          orderBy: { submittedAt: 'desc' },
          take: 5, // 只返回最近5次考试记录
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records;
  }

  /**
   * 查询考试记录历史
   */
  async findExamRecords(learningRecordId: string, userId: string) {
    const learningRecord = await this.prisma.learningRecord.findUnique({
      where: { id: learningRecordId },
      include: { project: true },
    });

    if (!learningRecord) {
      throw new NotFoundException('学习记录不存在');
    }

    // 权限校验：只有本人或培训讲师可以查看
    if (learningRecord.userId !== userId && learningRecord.project.trainerId !== userId) {
      throw new ForbiddenException('无权查看该学习记录');
    }

    const examRecords = await this.prisma.examRecord.findMany({
      where: { learningRecordId },
      orderBy: { submittedAt: 'desc' },
    });

    return examRecords;
  }

  /**
   * UI "培训记录" alias — maps LearningRecord rows + project archive into a
   * flat alias shape without introducing a separate TrainingRecord model.
   *
   * Alias shape:
   *   { trainingProjectId, learningRecordId, archiveId, participantId,
   *     completedAt, result }
   */
  async listTrainingRecordAliases(projectId: string): Promise<TrainingRecordAlias[]> {
    const project = await this.prisma.trainingProject.findUnique({
      where: { id: projectId },
      include: { archive: true },
    });

    if (!project) {
      throw new NotFoundException('培训项目不存在');
    }

    const records = await this.prisma.learningRecord.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    const archiveId = (project as any).archive?.id ?? null;

    return records.map((r) => ({
      trainingProjectId: projectId,
      learningRecordId: r.id,
      archiveId,
      participantId: r.userId,
      completedAt: r.completedAt ?? null,
      result: resolveResult(r),
    }));
  }

  // ==================== Private Helper Methods ====================

  private async getProjectById(id: string) {
    const project = await this.prisma.trainingProject.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('培训项目不存在');
    }

    return project;
  }
}

/**
 * Pure helper — derive the training record display result
 * from a LearningRecord row without mutating the record.
 */
function resolveResult(
  record: { passed: boolean; completedAt: Date | null | undefined },
): 'passed' | 'failed' | 'in_progress' {
  if (!record.completedAt) return 'in_progress';
  return record.passed ? 'passed' : 'failed';
}
