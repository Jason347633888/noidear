import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordService } from '../record/record.service';
import {
  getDefaultFormCodesForChangeScopes,
  getDefaultFormCodesForChangeType,
} from './change-event-default-form-rules';

@Injectable()
export class ChangeEventFormTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recordService: RecordService,
  ) {}

  async generateDefaultTasks(changeEventId: string, changeType: string, tx?: Prisma.TransactionClient) {
    return this.generateDefaultTasksForCodes(
      changeEventId,
      getDefaultFormCodesForChangeType(changeType),
      tx,
    );
  }

  /**
   * Same as {@link generateDefaultTasks} but takes the full list of change
   * scopes (e.g. ['recipe','process','haccp']) so multi-scope plans don't
   * lose forms after the legacy single-`changeType` collapse.
   */
  async generateDefaultTasksForScopes(
    changeEventId: string,
    scopes: string[],
    tx?: Prisma.TransactionClient,
  ) {
    return this.generateDefaultTasksForCodes(
      changeEventId,
      getDefaultFormCodesForChangeScopes(scopes),
      tx,
    );
  }

  private async generateDefaultTasksForCodes(
    changeEventId: string,
    codes: string[],
    tx?: Prisma.TransactionClient,
  ) {
    if (codes.length === 0) return [];

    const db = tx ?? this.prisma;
    const templates = await db.recordTemplate.findMany({
      where: { code: { in: codes }, deletedAt: null, status: { not: 'retired' } },
      select: { id: true, code: true, name: true },
    });
    const byCode = new Map(templates.map((t: { id: string; code: string; name: string }) => [t.code, t]));
    const data = codes
      .map((code, index) => ({ code, template: byCode.get(code), index }))
      .filter((item): item is { code: string; template: { id: string; code: string; name: string }; index: number } => Boolean(item.template))
      .map((item) => ({
        changeEventId,
        templateId: item.template.id,
        sourceFormCode: item.code,
        title: item.template.name,
        status: 'pending',
        required: true,
        sortOrder: item.index,
      }));

    if (data.length === 0) return [];

    await db.changeEventFormTask.createMany({ data, skipDuplicates: true });
    return this.listForChange(changeEventId);
  }

  async listForChange(changeEventId: string) {
    return this.prisma.changeEventFormTask.findMany({
      where: { changeEventId },
      include: {
        template: { select: { id: true, code: true, name: true, status: true } },
        record: { select: { id: true, number: true, status: true, createdAt: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async fillTask(taskId: string, dataJson: object, userId: string, existingRecordId?: string) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const task = await tx.changeEventFormTask.findUnique({ where: { id: taskId } });
      if (!task) throw new NotFoundException('变更表单任务不存在');
      if (task.recordId) throw new ConflictException('变更表单任务已填写');
      if (task.status !== 'pending') throw new BadRequestException('只有待填写任务可以填写');

      let recordId: string;
      if (existingRecordId) {
        const record = await tx.record.findUnique({ where: { id: existingRecordId } });
        if (!record || record.deletedAt) {
          throw new NotFoundException(`记录不存在: ${existingRecordId}`);
        }
        if (record.templateId !== task.templateId) {
          throw new BadRequestException('记录模板与任务要求的模板不一致');
        }
        if (record.changeEventId !== task.changeEventId) {
          throw new BadRequestException('记录关联的变更事件与任务不一致');
        }
        recordId = record.id;
      } else {
        const record = await this.recordService.create({
          templateId: task.templateId,
          dataJson,
          usageType: 'change' as const,
          sourceType: 'change_event',
          sourceId: task.changeEventId,
          changeEventId: task.changeEventId,
        }, userId);
        recordId = record.id;
      }

      return tx.changeEventFormTask.update({
        where: { id: task.id },
        data: { recordId, status: 'filled' },
        include: {
          template: { select: { id: true, code: true, name: true, status: true } },
          record: { select: { id: true, number: true, status: true, createdAt: true } },
        },
      });
    });
  }
}
