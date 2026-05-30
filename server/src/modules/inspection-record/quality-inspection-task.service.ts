import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AddInspectionTaskInput {
  company_id: string;
  work_date: Date;
  shift_type?: string;
  area_point_id?: string;
  production_batch_id?: string;
  task_type: string;
  target_resource_type: string;
  target_resource_id?: string;
  standard_id?: string;
  assignee_role?: string;
  assignee_user_id?: string;
  due_at?: Date;
}

export interface ListWorkbenchTasksInput {
  company_id: string;
  work_date: Date;
  status?: string;
  task_type?: string;
  area_point_id?: string;
}

@Injectable()
export class QualityInspectionTaskService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a standard set of tasks for a given work date.
   * Returns the created tasks (currently an empty list until scheduling config is
   * wired to a persistent task template source).
   */
  async generateTasksForDate(
    companyId: string,
    workDate: Date,
    _filters?: Partial<ListWorkbenchTasksInput>,
  ) {
    // Future: query a scheduling config table to determine which tasks to create
    // For now returns an empty array — callers can use addInspectionTask() to add tasks manually
    return [] as Awaited<ReturnType<typeof this.prisma.qualityInspectionTask.findMany>>;
  }

  /**
   * Add a single quality inspection task.
   * The task stores WHO, WHEN, and WHAT-TYPE of inspection is needed.
   * Actual inspection results stay in their own fact tables (InspectionRecord, EnvironmentRecord, etc.)
   */
  async addInspectionTask(input: AddInspectionTaskInput) {
    return this.prisma.qualityInspectionTask.create({
      data: {
        company_id: input.company_id,
        work_date: input.work_date,
        shift_type: input.shift_type ?? null,
        area_point_id: input.area_point_id ?? null,
        production_batch_id: input.production_batch_id ?? null,
        task_type: input.task_type,
        target_resource_type: input.target_resource_type,
        target_resource_id: input.target_resource_id ?? null,
        standard_id: input.standard_id ?? null,
        assignee_role: input.assignee_role ?? null,
        assignee_user_id: input.assignee_user_id ?? null,
        due_at: input.due_at ?? null,
        status: 'pending',
      },
    });
  }

  /**
   * Mark a task as complete by linking it to the real completed fact record.
   * This does NOT create a second fact table row — it only updates the pointer fields.
   *
   * Routing by task type:
   *   - Inspection-style tasks → completedResourceType = 'inspection_record'
   *   - Environmental observations → completedResourceType = 'environment_record'
   *   - Sanitizer checks → completedResourceType = 'sanitizer_concentration_check'
   */
  async completeInspectionTask(
    taskId: string,
    completedResourceType: string,
    completedResourceId: string,
    companyId: string,
  ) {
    const allowedResourceTypes = [
      'inspection_record',
      'environment_record',
      'sanitizer_concentration_check',
    ] as const;

    if (!allowedResourceTypes.includes(completedResourceType as (typeof allowedResourceTypes)[number])) {
      throw new BadRequestException(
        `Invalid completedResourceType: "${completedResourceType}". Allowed: ${allowedResourceTypes.join(', ')}`,
      );
    }

    const task = await this.prisma.qualityInspectionTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`QualityInspectionTask ${taskId} not found`);
    }
    if (task.company_id !== companyId) {
      throw new NotFoundException(`QualityInspectionTask ${taskId} not found`);
    }
    if (task.status !== 'pending') {
      throw new BadRequestException(
        `Task ${taskId} cannot be completed because its status is "${task.status}"`,
      );
    }

    const resourceModelMap: Record<string, keyof typeof this.prisma> = {
      inspection_record: 'inspectionRecord',
      environment_record: 'environmentRecord',
      sanitizer_concentration_check: 'sanitizerConcentrationCheck',
    };
    const modelName = resourceModelMap[completedResourceType];
    const resourceCount = await (this.prisma[modelName] as any).count({
      where: { id: completedResourceId },
    });
    if (resourceCount === 0) {
      throw new NotFoundException(
        `${completedResourceType} ${completedResourceId} does not exist`,
      );
    }

    return this.prisma.qualityInspectionTask.update({
      where: { id: taskId },
      data: {
        status: 'done',
        completed_resource_type: completedResourceType,
        completed_resource_id: completedResourceId,
      },
    });
  }

  /**
   * Skip a task and record the reason (e.g. equipment down, not applicable today).
   */
  async skipTask(taskId: string, reason: string | undefined, companyId: string) {
    const task = await this.prisma.qualityInspectionTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`QualityInspectionTask ${taskId} not found`);
    }
    if (task.company_id !== companyId) {
      throw new NotFoundException(`QualityInspectionTask ${taskId} not found`);
    }
    if (task.status !== 'pending') {
      throw new BadRequestException(
        `Task ${taskId} cannot be skipped because its status is "${task.status}"`,
      );
    }

    return this.prisma.qualityInspectionTask.update({
      where: { id: taskId },
      data: {
        status: 'skipped',
        skipped_reason: reason ?? null,
      },
    });
  }

  /**
   * List all tasks for the quality inspection workbench on a given day.
   * The workbench is a UI/query concept — there is no separate Prisma model for it.
   */
  async listWorkbenchTasks(filters: ListWorkbenchTasksInput) {
    return this.prisma.qualityInspectionTask.findMany({
      where: {
        company_id: filters.company_id,
        work_date: filters.work_date,
        ...(filters.status !== undefined ? { status: filters.status } : {}),
        ...(filters.task_type !== undefined ? { task_type: filters.task_type } : {}),
        ...(filters.area_point_id !== undefined ? { area_point_id: filters.area_point_id } : {}),
      },
      orderBy: [{ task_type: 'asc' }, { created_at: 'asc' }],
    });
  }
}
