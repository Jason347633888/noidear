import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAssignmentDto {
  templateId: string;
  title: string;
  departmentId: string;
  isPeriodic?: boolean;
  periodType?: string;
  periodConfig?: Record<string, unknown>;
  deadlineDays?: number; // days from now for first instance
}

@Injectable()
export class RecordTaskAssignmentService {
  private readonly logger = new Logger(RecordTaskAssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAssignmentDto, creatorId: string) {
    const template = await this.prisma.recordTemplate.findUnique({
      where: { id: dto.templateId },
    });
    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    const assignment = await this.prisma.recordTaskAssignment.create({
      data: {
        templateId: dto.templateId,
        title: dto.title,
        departmentId: dto.departmentId,
        isPeriodic: dto.isPeriodic ?? false,
        periodType: dto.periodType,
        periodConfig: dto.periodConfig as Prisma.InputJsonValue ?? Prisma.JsonNull,
        creatorId,
      },
    });

    // 非周期任务立即生成一条实例
    if (!dto.isPeriodic) {
      const deadlineDays = dto.deadlineDays ?? 7;
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + deadlineDays);
      await this.prisma.recordTaskInstance.create({
        data: { assignmentId: assignment.id, deadline },
      });
    }

    return assignment;
  }

  async findAll(userId: string, isAdmin: boolean) {
    if (isAdmin) {
      return this.prisma.recordTaskAssignment.findMany({
        include: { template: true, department: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    if (!user?.departmentId) {
      return [];
    }

    return this.prisma.recordTaskAssignment.findMany({
      where: { departmentId: user.departmentId, status: 'active' },
      include: { template: true, department: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const assignment = await this.prisma.recordTaskAssignment.findUnique({
      where: { id },
      include: { template: true, department: true, instances: true },
    });
    if (!assignment) {
      throw new NotFoundException('任务配置不存在');
    }
    return assignment;
  }

  async pause(id: string) {
    await this.requireExists(id);
    return this.prisma.recordTaskAssignment.update({
      where: { id },
      data: { status: 'paused' },
    });
  }

  async resume(id: string) {
    await this.requireExists(id);
    return this.prisma.recordTaskAssignment.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  async close(id: string) {
    await this.requireExists(id);
    return this.prisma.recordTaskAssignment.update({
      where: { id },
      data: { status: 'closed' },
    });
  }

  private async requireExists(id: string) {
    const exists = await this.prisma.recordTaskAssignment.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('任务配置不存在');
    }
    return exists;
  }
}
