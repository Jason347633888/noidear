import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QualityNumberSequenceService } from '../quality-number-sequence/quality-number-sequence.service';

const ALLOWED_DRILL_TYPES = ['forward', 'backward', 'both'] as const;
type DrillType = (typeof ALLOWED_DRILL_TYPES)[number];

const ALLOWED_CONCLUSIONS = ['passed', 'failed'] as const;
type DrillConclusion = (typeof ALLOWED_CONCLUSIONS)[number];

export interface PlanDrillInput {
  company_id: string;
  drill_type: string;
  drill_date: Date;
  planned_start?: Date;
  planned_end?: Date;
  simulated_case?: string;
  root_object_type: string;
  root_object_id: string;
  participants: string[];
  reviewer_id?: string;
  approver_id?: string;
}

function assertValidDrillType(value: string): asserts value is DrillType {
  if (!ALLOWED_DRILL_TYPES.includes(value as DrillType)) {
    throw new BadRequestException(
      `drill_type must be one of: ${ALLOWED_DRILL_TYPES.join(', ')}; got "${value}"`,
    );
  }
}

function assertValidConclusion(value: string): asserts value is DrillConclusion {
  if (!ALLOWED_CONCLUSIONS.includes(value as DrillConclusion)) {
    throw new BadRequestException(
      `conclusion must be one of: ${ALLOWED_CONCLUSIONS.join(', ')}; got "${value}"`,
    );
  }
}

@Injectable()
export class TraceabilityDrillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequence: QualityNumberSequenceService,
  ) {}

  async planDrill(input: PlanDrillInput) {
    assertValidDrillType(input.drill_type);

    if (!input.root_object_id) {
      throw new BadRequestException('root_object_id is required');
    }

    return this.prisma.traceabilityDrill.create({
      data: {
        company_id: input.company_id,
        drill_type: input.drill_type,
        drill_date: input.drill_date,
        planned_start: input.planned_start ?? null,
        planned_end: input.planned_end ?? null,
        simulated_case: input.simulated_case ?? null,
        root_object_type: input.root_object_type,
        root_object_id: input.root_object_id,
        participants: input.participants,
        reviewer_id: input.reviewer_id ?? null,
        approver_id: input.approver_id ?? null,
        status: 'planned',
      },
    });
  }

  async startDrill(drillId: string, companyId: string) {
    const drill = await this.findDrillOrThrow(drillId, companyId);

    if (drill.status !== 'planned') {
      throw new ConflictException(
        `Cannot start drill in status "${drill.status}"; expected "planned"`,
      );
    }

    return this.prisma.traceabilityDrill.update({
      where: { id: drillId },
      data: {
        status: 'in_progress',
        actual_start: new Date(),
      },
    });
  }

  async attachSnapshot(drillId: string, snapshotId: string, companyId: string) {
    const drill = await this.findDrillOrThrow(drillId, companyId);

    if (drill.status !== 'in_progress') {
      throw new ConflictException(
        `Cannot attach snapshot to drill in status "${drill.status}"; expected "in_progress"`,
      );
    }

    const snapshot = await this.prisma.traceabilitySnapshot.findFirst({
      where: { id: snapshotId, company_id: companyId },
    });
    if (!snapshot) {
      throw new NotFoundException(`Traceability snapshot "${snapshotId}" not found`);
    }

    return this.prisma.traceabilityDrill.update({
      where: { id: drillId },
      data: { traceability_snapshot_id: snapshotId },
    });
  }

  async concludeDrill(drillId: string, conclusion: string, companyId: string, reviewerId?: string) {
    assertValidConclusion(conclusion);

    const drill = await this.findDrillOrThrow(drillId, companyId);

    if (drill.status !== 'in_progress') {
      throw new ConflictException(
        `Cannot conclude drill in status "${drill.status}"; expected "in_progress"`,
      );
    }

    if (!drill.traceability_snapshot_id) {
      throw new ConflictException('Cannot conclude drill without an attached traceability snapshot');
    }

    const snapshot = await this.prisma.traceabilitySnapshot.findFirst({
      where: { id: drill.traceability_snapshot_id, company_id: companyId },
    });

    if (!snapshot || snapshot.readinessStatus !== 'complete') {
      const readiness = snapshot ? snapshot.readinessStatus : 'not_found';
      throw new ConflictException(
        `Cannot conclude drill; snapshot readiness is "${readiness}", expected "complete"`,
      );
    }

    return this.prisma.traceabilityDrill.update({
      where: { id: drillId },
      data: {
        status: 'completed',
        conclusion,
        conclusion_at: new Date(),
        actual_end: new Date(),
        ...(reviewerId ? { reviewer_id: reviewerId } : {}),
      },
    });
  }

  async createCapaForFailedDrill(drillId: string, userId: string, companyId: string) {
    const drill = await this.findDrillOrThrow(drillId, companyId);

    if (drill.conclusion !== 'failed') {
      throw new ConflictException(
        `Cannot create CAPA for drill with conclusion "${drill.conclusion}"; expected "failed"`,
      );
    }

    if (drill.capa_id) {
      throw new ConflictException(
        `Drill "${drillId}" already has a linked CAPA: "${drill.capa_id}"`,
      );
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const capaNo = await this.numberSequence.generateCorrectiveActionNo(companyId, now, tx);

      const capa = await tx.correctiveAction.create({
        data: {
          company_id: companyId,
          capa_no: capaNo,
          trigger_type: 'other',
          description: `Traceability drill "${drillId}" failed — CAPA auto-generated`,
          responsible_id: userId,
        },
      });

      return tx.traceabilityDrill.update({
        where: { id: drillId },
        data: { capa_id: capa.id },
      });
    });
  }

  private async findDrillOrThrow(drillId: string, companyId: string) {
    const drill = await this.prisma.traceabilityDrill.findFirst({
      where: { id: drillId, company_id: companyId },
    });
    if (!drill) {
      throw new NotFoundException(`Traceability drill "${drillId}" not found`);
    }
    return drill;
  }
}
