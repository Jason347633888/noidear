import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from '../unified-approval/approval-engine.service';
import { CreateChangeEventDto } from './dto/create-change-event.dto';
import { CreateVerificationDto } from './dto/create-verification.dto';

@Injectable()
export class ChangeEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly approvalEngine?: ApprovalEngineService,
  ) {}

  async create(dto: CreateChangeEventDto, userId: string) {
    const count = await this.prisma.changeEvent.count();
    const year = new Date().getFullYear();
    const change_no = `CE-${year}-${String(count + 1).padStart(4, '0')}`;
    const changeEvent = await this.prisma.changeEvent.create({
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

    try {
      await this.approvalEngine?.startApproval({
        resourceType: 'change_event',
        resourceId: changeEvent.id,
        resourceStep: 'submit',
        triggerKey: 'submit',
        title: `变更事件审批：${change_no}`,
        createdById: userId,
      });
    } catch { /* no definition = skip */ }

    return changeEvent;
  }

  async findAll() {
    return this.prisma.changeEvent.findMany({
      include: { verifications: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.changeEvent.findUnique({
      where: { id },
      include: { verifications: true },
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
