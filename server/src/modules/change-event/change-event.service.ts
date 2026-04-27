import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from '../unified-approval/approval-engine.service';
import { ChangeEventFormTaskService } from './change-event-form-task.service';
import { ChangeEventRelationService } from './change-event-relation.service';
import { CreateChangeEventDto } from './dto/create-change-event.dto';
import { CreateVerificationDto } from './dto/create-verification.dto';

@Injectable()
export class ChangeEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly formTaskService: ChangeEventFormTaskService,
    private readonly relationService: ChangeEventRelationService,
    @Optional() private readonly approvalEngine?: ApprovalEngineService,
  ) {}

  async create(dto: CreateChangeEventDto, userId: string) {
    const year = new Date().getFullYear();
    const changeEvent = await this.prisma.$transaction(async (tx: any) => {
      const count = await tx.changeEvent.count();
      const change_no = `CE-${year}-${String(count + 1).padStart(4, '0')}`;
      const created = await tx.changeEvent.create({
        data: {
          company_id: '1',
          change_no,
          change_type: dto.change_type,
          description: dto.description,
          reason: dto.title,
          applied_by: userId,
          applied_at: new Date(),
          status: dto.status ?? 'pending',
        },
      });

      await this.relationService.createRelations(created.id, dto.relations ?? []);
      await this.formTaskService.generateDefaultTasks(created.id, dto.change_type);
      return created;
    });

    try {
      await this.approvalEngine?.startApproval({
        resourceType: 'change_event',
        resourceId: changeEvent.id,
        resourceStep: 'submit',
        triggerKey: 'submit',
        title: `变更事件审批：${changeEvent.change_no}`,
        createdById: userId,
      });
    } catch {
      // no approval definition = skip
    }

    return this.findOne(changeEvent.id);
  }

  async findAll() {
    return this.prisma.changeEvent.findMany({
      include: {
        verifications: true,
        relations: true,
        formTasks: {
          include: {
            template: { select: { id: true, code: true, name: true, status: true } },
            record: { select: { id: true, number: true, status: true, createdAt: true } },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.changeEvent.findUnique({
      where: { id },
      include: {
        verifications: true,
        relations: true,
        formTasks: {
          include: {
            template: { select: { id: true, code: true, name: true, status: true } },
            record: { select: { id: true, number: true, status: true, createdAt: true } },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  async updateStatus(id: string, status: string, userId: string) {
    const updated = await this.prisma.changeEvent.update({
      where: { id },
      data: {
        status,
        ...(status === 'approved' ? { approved_by: userId } : {}),
      },
    });

    this.eventEmitter.emit('change-event.status-changed', {
      id,
      status,
      company_id: updated.company_id,
    });

    return updated;
  }

  async approve(id: string, userId: string) {
    return this.updateStatus(id, 'approved', userId);
  }

  async remove(id: string) {
    return this.prisma.changeEvent.delete({ where: { id } });
  }

  async createVerification(dto: CreateVerificationDto, userId: string) {
    return this.prisma.changeVerificationRecord.create({
      data: {
        company_id: '1',
        change_event_id: dto.change_event_id,
        verification_plan: dto.description ?? '',
        verification_result: dto.result,
        verdict: dto.result,
        verified_by: dto.verified_by ?? userId,
        verified_at: new Date(dto.verification_date),
      },
    });
  }

  async findVerifications(changeEventId: string) {
    return this.prisma.changeVerificationRecord.findMany({
      where: { change_event_id: changeEventId },
      orderBy: { created_at: 'desc' },
    });
  }
}
