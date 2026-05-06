import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from '../unified-approval/approval-engine.service';
import { Snowflake } from '../../common/utils/snowflake';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { SubmitTaskDto } from './dto/submit-task.dto';
import { SaveTaskDraftDto } from './dto/save-task-draft.dto';
import { ApproveTaskDto } from './dto/approve-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';

interface TemplateField {
  name: string;
  type: string;
  required?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
}

interface UserContext {
  id: string;
  role: string;
  roleObj?: { code: string } | null;
  departmentId: string | null;
}

@Injectable()
export class TaskService {
  private readonly snowflake: Snowflake;
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly approvalEngine: ApprovalEngineService,
  ) {
    this.snowflake = new Snowflake(2, 1);
  }

  private isAdminOrLeader(role: string): boolean {
    return role === 'admin' || role === 'leader';
  }

  private async getUserContext(userId: string): Promise<UserContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, departmentId: true, roleObj: { select: { code: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateTaskDto, userId: string) {
    const user = await this.getUserContext(userId);
    const roleCode = user.roleObj?.code ?? user.role;
    if (!this.isAdminOrLeader(roleCode)) {
      throw new ForbiddenException('Only admin or leader can create tasks');
    }

    const template = await this.prisma.recordTemplate.findUnique({
      where: { id: dto.templateId },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    if (template.status !== 'active') {
      throw new BadRequestException('Template is not active (BR-005)');
    }

    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const task = await this.prisma.task.create({
      data: {
        id: this.snowflake.nextId(),
        templateId: dto.templateId,
        departmentId: dto.departmentId,
        deadline: new Date(dto.deadline),
        title: dto.title,
        description: dto.description,
        creatorId: userId,
        status: 'pending',
      },
      include: {
        template: true,
        department: true,
        creator: { select: { id: true, name: true, username: true } },
      },
    });

    // Notify all active members of the target department
    await this.notifyDepartmentMembers(dto.departmentId, {
      type: 'task',
      title: '新任务分配',
      content: `您有新任务：${template.name}，截止时间 ${new Date(dto.deadline).toLocaleDateString()}`,
    });

    return task;
  }

  async findAll(userId: string, query: QueryTaskDto) {
    const user = await this.getUserContext(userId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    const roleCode = user.roleObj?.code ?? user.role;

    if (!this.isAdminOrLeader(roleCode)) {
      // Regular members only see their own department
      where['departmentId'] = user.departmentId;
    } else if (query.departmentId) {
      where['departmentId'] = query.departmentId;
    }

    if (query.status) {
      where['status'] = query.status;
    }

    const [list, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        include: {
          template: true,
          department: true,
          creator: { select: { id: true, name: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  async findOne(id: string, userId: string) {
    const user = await this.getUserContext(userId);

    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        template: true,
        department: true,
        creator: { select: { id: true, name: true, username: true } },
        records: {
          include: {
            submitter: { select: { id: true, name: true, username: true } },
            approver: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const roleCode = user.roleObj?.code ?? user.role;
    if (!this.isAdminOrLeader(roleCode)) {
      if (task.departmentId !== user.departmentId) {
        throw new ForbiddenException('Access denied: different department');
      }
    }
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId: string) {
    const user = await this.getUserContext(userId);

    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const roleCode = user.roleObj?.code ?? user.role;
    if (roleCode !== 'admin' && task.creatorId !== userId) {
      throw new ForbiddenException('Only admin or task creator can update');
    }
    if (task.status !== 'pending') {
      throw new ConflictException('Only pending tasks can be updated');
    }

    const updateData: Record<string, unknown> = {};

    if (dto.deadline !== undefined) {
      updateData['deadline'] = new Date(dto.deadline);
    }
    if (dto.departmentId !== undefined) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (!dept) {
        throw new NotFoundException('Department not found');
      }
      updateData['departmentId'] = dto.departmentId;
    }

    return this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        template: true,
        department: true,
        creator: { select: { id: true, name: true, username: true } },
      },
    });
  }

  async submit(taskId: string, dto: SubmitTaskDto, userId: string) {
    const user = await this.getUserContext(userId);

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { template: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Department check for non-admin/leader
    const roleCode = user.roleObj?.code ?? user.role;
    if (!this.isAdminOrLeader(roleCode)) {
      if (task.departmentId !== user.departmentId) {
        throw new ForbiddenException('Access denied: different department');
      }
    }

    if (task.status !== 'pending') {
      throw new ConflictException('Task is not in pending status');
    }

    // Check for duplicate submission by the same user (already submitted, not draft)
    const existing = await this.prisma.taskRecord.findFirst({
      where: { taskId, submitterId: userId, status: 'submitted' },
    });
    if (existing) {
      throw new ConflictException('You have already submitted this task (BR-014)');
    }

    // Validate fields against template
    const fields = this.extractFields(task.template.fieldsJson);
    this.validateFields(dto.data ?? {}, fields);

    // Detect deviations
    const deviationResult = this.detectDeviations(dto.data ?? {}, fields);

    const record = await this.prisma.taskRecord.create({
      data: {
        id: this.snowflake.nextId(),
        taskId,
        templateId: task.templateId,
        dataJson: (dto.data ?? {}) as object,
        submitterId: userId,
        status: 'submitted',
        submittedAt: new Date(),
        hasDeviation: deviationResult.hasDeviation,
        deviationCount: deviationResult.deviationCount,
        deviationReasons: dto.deviationReasons ? (dto.deviationReasons as object) : undefined,
      },
    });

    if (this.approvalEngine) {
      try {
        const approval = await this.approvalEngine.startApproval({
          resourceType: 'taskRecord',
          resourceId: record.id,
          resourceStep: 'submit',
          triggerKey: 'submit',
          title: `任务记录审批：${task.title ?? taskId}`,
          createdById: userId,
        });
        await this.prisma.taskRecord.update({
          where: { id: record.id },
          data: { approvalInstanceId: approval.id },
        });
      } catch {
        // No ApprovalDefinition matched — skip unified tracking silently
      }
    }

    return record;
  }

  async saveDraft(taskId: string, dto: SaveTaskDraftDto, userId: string) {
    const user = await this.getUserContext(userId);

    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const roleCode = user.roleObj?.code ?? user.role;
    if (!this.isAdminOrLeader(roleCode)) {
      if (task.departmentId !== user.departmentId) {
        throw new ForbiddenException('Access denied: different department');
      }
    }

    if (task.status !== 'pending') {
      throw new ConflictException('Task is not in pending status');
    }

    // Persist draft data on the Task itself for quick frontend access
    await this.prisma.task.update({
      where: { id: taskId },
      data: { draftData: (dto.data ?? {}) as object },
    });

    // Upsert: update existing pending draft or create a new one
    const existingDraft = await this.prisma.taskRecord.findFirst({
      where: { taskId, submitterId: userId, status: 'pending' },
    });

    if (existingDraft) {
      return this.prisma.taskRecord.update({
        where: { id: existingDraft.id },
        data: { dataJson: (dto.data ?? {}) as object },
      });
    }

    return this.prisma.taskRecord.create({
      data: {
        id: this.snowflake.nextId(),
        taskId,
        templateId: task.templateId,
        dataJson: (dto.data ?? {}) as object,
        submitterId: userId,
        status: 'pending',
      },
    });
  }

  async cancel(taskId: string, userId: string) {
    const user = await this.getUserContext(userId);

    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const roleCode = user.roleObj?.code ?? user.role;
    if (roleCode !== 'admin' && task.creatorId !== userId) {
      throw new ForbiddenException('Only admin or task creator can cancel');
    }
    if (task.status !== 'pending') {
      throw new ConflictException('Only pending tasks can be cancelled');
    }

    // Cannot cancel if there are submitted records
    const submittedCount = await this.prisma.taskRecord.count({
      where: { taskId, status: 'submitted' },
    });
    if (submittedCount > 0) {
      throw new ConflictException('Cannot cancel task with submitted records');
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'cancelled' },
    });

    // Notify department members about cancellation
    await this.notifyDepartmentMembers(task.departmentId, {
      type: 'task',
      title: '任务已取消',
      content: `任务已被取消`,
    });

    return updated;
  }

  async approve(dto: ApproveTaskDto, userId: string) {
    const record = await this.prisma.taskRecord.findUnique({
      where: { id: dto.recordId },
    });
    if (!record) {
      throw new NotFoundException('Task record not found');
    }
    if (record.status !== 'submitted') {
      throw new ConflictException('Record has already been processed');
    }

    await this.prisma.taskRecord.update({
      where: { id: dto.recordId },
      data: {
        status: dto.status,
        approverId: userId,
        approvedAt: new Date(),
        comment: dto.comment,
      },
    });

    await this.prisma.task.update({
      where: { id: record.taskId },
      data: { status: dto.status },
    });

    return { success: true };
  }

  async getPendingApprovals(query: QueryTaskDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = { status: 'submitted' };

    const [list, total] = await Promise.all([
      this.prisma.taskRecord.findMany({
        where,
        skip,
        take: limit,
        include: {
          task: {
            include: {
              template: true,
              department: true,
            },
          },
          submitter: { select: { id: true, name: true, username: true } },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.taskRecord.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  private extractFields(fieldsJson: unknown): TemplateField[] {
    if (Array.isArray(fieldsJson)) return fieldsJson as TemplateField[];
    if (fieldsJson && typeof fieldsJson === 'object') {
      const json = fieldsJson as Record<string, unknown>;
      if (Array.isArray(json['sections'])) {
        return (json['sections'] as Array<{ fields?: TemplateField[] }>).flatMap(
          (s) => (Array.isArray(s.fields) ? s.fields : []),
        );
      }
    }
    return [];
  }

  private validateFields(data: Record<string, unknown>, fields: TemplateField[]) {
    const errors: string[] = [];
    for (const field of fields) {
      const value = data[field.name];
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field '${field.name}' is required`);
        continue;
      }
      if (value !== undefined && value !== null) {
        if (field.type === 'number') {
          const num = Number(value);
          if (field.max !== undefined && num > field.max) {
            errors.push(`Field '${field.name}' exceeds max value ${field.max}`);
          }
          if (field.min !== undefined && num < field.min) {
            errors.push(`Field '${field.name}' is below min value ${field.min}`);
          }
        }
        if (field.type === 'text' && field.maxLength !== undefined) {
          const str = String(value);
          if (str.length > field.maxLength) {
            errors.push(`Field '${field.name}' exceeds maxLength ${field.maxLength}`);
          }
        }
      }
    }
    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }

  private detectDeviations(data: Record<string, unknown>, fields: TemplateField[]) {
    let deviationCount = 0;
    for (const field of fields) {
      const value = data[field.name];
      if (value === undefined || value === null) continue;
      if (field.type === 'number') {
        const num = Number(value);
        if (
          (field.min !== undefined && num < field.min) ||
          (field.max !== undefined && num > field.max)
        ) {
          deviationCount++;
        }
      }
    }
    return { hasDeviation: deviationCount > 0, deviationCount };
  }

  private async notifyDepartmentMembers(
    departmentId: string,
    notification: { type: string; title: string; content: string },
  ) {
    const members = await this.prisma.user.findMany({
      where: { departmentId, status: 'active' },
      select: { id: true },
    });

    if (members.length === 0) return;

    const notifSnowflake = new Snowflake(2, 2);
    await this.prisma.notification.createMany({
      data: members.map((m) => ({
        id: notifSnowflake.nextId(),
        userId: m.id,
        type: notification.type,
        title: notification.title,
        content: notification.content,
      })),
    });
  }
}
