import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordService } from '../record/record.service';
import { getDefaultFormCodesForChangeType } from './change-event-default-form-rules';

@Injectable()
export class ChangeEventFormTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recordService: RecordService,
  ) {}

  async generateDefaultTasks(changeEventId: string, changeType: string, tx?: Prisma.TransactionClient) {
    const codes = getDefaultFormCodesForChangeType(changeType);
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

  async fillTask(taskId: string, dataJson: object, userId: string) {
    const task = await this.prisma.changeEventFormTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('变更表单任务不存在');
    if (task.recordId) throw new ConflictException('变更表单任务已填写');
    if (task.status !== 'pending') throw new BadRequestException('只有待填写任务可以填写');

    const record = await this.recordService.create({
      templateId: task.templateId,
      dataJson,
      usageType: 'change' as const,
      sourceType: 'change_event',
      sourceId: task.changeEventId,
      changeEventId: task.changeEventId,
    }, userId);

    return this.prisma.changeEventFormTask.update({
      where: { id: task.id },
      data: { recordId: record.id, status: 'filled' },
      include: {
        template: { select: { id: true, code: true, name: true, status: true } },
        record: { select: { id: true, number: true, status: true, createdAt: true } },
      },
    });
  }
}
