import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RecordService {
  constructor(private readonly prisma: PrismaService) {}

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
