import { Injectable, InternalServerErrorException, Logger, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from '../unified-approval/approval-engine.service';
import { ChangeEventFormTaskService } from './change-event-form-task.service';
import { ChangeEventRelationService } from './change-event-relation.service';
import { CreateChangeEventDto } from './dto/create-change-event.dto';
import { CreateVerificationDto } from './dto/create-verification.dto';

@Injectable()
export class ChangeEventService {
  private readonly logger = new Logger(ChangeEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly formTaskService: ChangeEventFormTaskService,
    private readonly relationService: ChangeEventRelationService,
    @Optional() private readonly approvalEngine?: ApprovalEngineService,
  ) {}

  /**
   * Backwards-compatible facade. Task 4 split this into two phases:
   * 1. {@link createDraftEvent} writes the ChangeEvent + relations + default form tasks.
   * 2. {@link submitForApproval} kicks off the unified approval workflow.
   *
   * The product-process-change adapter (Task 4) needs to insert validation
   * between (1) and (2). Existing callers (controller / legacy tests) can still
   * use `create()` to do both in one go.
   */
  async create(dto: CreateChangeEventDto, userId: string) {
    const changeEvent = await this.createDraftEvent(dto, userId);
    // Legacy callers (controller / older tests) expect best-effort approval
    // startup — they should not crash if the unified approval definition is
    // missing. The new ProductProcessChangeService path calls
    // submitForApproval directly and DOES want the error to surface so its
    // outer transaction rolls back.
    try {
      await this.submitForApproval(changeEvent.id, userId);
    } catch (error) {
      this.logger.warn(
        'Approval engine skipped (no definition or error)',
        error instanceof Error ? error.message : String(error),
      );
    }
    const result = await this.findOne(changeEvent.id);
    if (!result) {
      throw new InternalServerErrorException('刚创建的变更事件读取失败');
    }
    return result;
  }

  /**
   * Phase 1 of change-event creation: persist the ChangeEvent record together
   * with its relations and default form tasks in a single transaction. Does
   * NOT start the approval workflow — see {@link submitForApproval}.
   */
  async createDraftEvent(
    dto: CreateChangeEventDto,
    userId: string,
    tx?: Prisma.TransactionClient,
    options?: { scopes?: string[] },
  ) {
    // Validate relations BEFORE the transaction (read-only checks)
    await this.relationService.validateRelations(dto.relations ?? []);

    const year = new Date().getFullYear();

    const run = async (db: Prisma.TransactionClient) => {
      const count = await db.changeEvent.count();
      const change_no = `CE-${year}-${String(count + 1).padStart(4, '0')}`;
      const created = await db.changeEvent.create({
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

      await this.relationService.createRelations(created.id, dto.relations ?? [], db);
      // Multi-scope plans (e.g. recipe + process + haccp) must NOT collapse
      // into a single change_type — the per-scope union of form codes is
      // what the user actually needs to fill.
      if (options?.scopes && options.scopes.length > 0) {
        await this.formTaskService.generateDefaultTasksForScopes(created.id, options.scopes, db);
      } else {
        await this.formTaskService.generateDefaultTasks(created.id, dto.change_type, db);
      }

      return created;
    };

    if (tx) {
      return run(tx);
    }
    return this.prisma.$transaction(run);
  }

  /**
   * Phase 2 of change-event creation: hand off to the unified approval engine.
   * Safe to call from inside an outer transaction; the engine itself runs its
   * own transactional logic.
   */
  async submitForApproval(changeEventId: string, userId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const changeEvent = await db.changeEvent.findUnique({ where: { id: changeEventId } });
    if (!changeEvent) {
      throw new Error(`ChangeEvent ${changeEventId} not found`);
    }
    // NOTE: ApprovalEngineService.startApproval can run inside an outer tx
    // when one is forwarded via `input.tx`; otherwise it owns its own
    // transaction. We deliberately do NOT swallow its errors here — if
    // approval startup fails after the plan was flipped to `pending_approval`,
    // callers (e.g. ProductProcessChangeService) rely on the throw to roll
    // back their outer transaction so we never end up with a plan in
    // `pending_approval` whose approval was never created. Legacy
    // best-effort semantics live in `create()`.
    await this.approvalEngine?.startApproval({
      resourceType: 'change_event',
      resourceId: changeEvent.id,
      resourceStep: 'submit',
      triggerKey: 'approve_change',
      title: `变更事件审批：${changeEvent.change_no}`,
      createdById: userId,
      tx,
    });
    return changeEvent;
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
