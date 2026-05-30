import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type CreateShelfLifeStudyInput = {
  companyId: string;
  productId: string;
  retainedSampleId?: string;
  studyType: 'initial' | 'periodic';
  storageConditions: Record<string, unknown>;
  startedAt: string;
  plannedEndedAt: string;
  points: Array<{
    pointCode: string;
    sequence: number;
    plannedAt: string;
  }>;
};

const SHELF_LIFE_STUDY_OBJECT_TYPE = 'shelf_life_study';
const ALLOWED_CONCLUSIONS = ['pass', 'fail'] as const;
type AllowedConclusion = (typeof ALLOWED_CONCLUSIONS)[number];

type TxClient = Prisma.TransactionClient;

type StudyPoint = {
  status: string;
  skip_reason: string | null;
  inspection_record_id: string | null;
  point_code: string;
};

function assertNonEmptyPoints(points: CreateShelfLifeStudyInput['points']): void {
  if (!points || points.length === 0) {
    throw new BadRequestException('At least one inspection point is required');
  }
}

function assertUniquePointCodes(points: CreateShelfLifeStudyInput['points']): void {
  const codes = points.map((p) => p.pointCode);
  const unique = new Set(codes);
  if (unique.size !== codes.length) {
    throw new BadRequestException('Duplicate point codes are not allowed');
  }
}

function assertStudyExists<T extends { id: string }>(
  study: T | null,
  studyId: string,
): asserts study is T {
  if (!study) {
    throw new BadRequestException(`ShelfLifeStudy ${studyId} not found`);
  }
}

function assertValidConclusion(conclusion: string): asserts conclusion is AllowedConclusion {
  if (!(ALLOWED_CONCLUSIONS as readonly string[]).includes(conclusion)) {
    throw new BadRequestException(
      `Invalid conclusion "${conclusion}". Allowed values: ${ALLOWED_CONCLUSIONS.join(', ')}`,
    );
  }
}

function assertNoPendingPoints(points: StudyPoint[]): void {
  const pending = points.filter((p) => p.status === 'pending');
  if (pending.length > 0) {
    const codes = pending.map((p) => p.point_code).join(', ');
    throw new BadRequestException(`Cannot conclude: points still pending — ${codes}`);
  }
}

function assertSkippedPointsHaveReason(points: StudyPoint[]): void {
  const missing = points.filter((p) => p.status === 'skipped' && !p.skip_reason?.trim());
  if (missing.length > 0) {
    const codes = missing.map((p) => p.point_code).join(', ');
    throw new BadRequestException(
      `Skipped points must have a skip_reason — missing for: ${codes}`,
    );
  }
}

function assertDonePointsHaveInspectionRecord(points: StudyPoint[]): void {
  const missing = points.filter((p) => p.status === 'done' && !p.inspection_record_id);
  if (missing.length > 0) {
    const codes = missing.map((p) => p.point_code).join(', ');
    throw new BadRequestException(
      `Done points must have an inspection_record_id — missing for: ${codes}`,
    );
  }
}

@Injectable()
export class ShelfLifeService {
  constructor(private readonly prisma: PrismaService) {}

  async listShelfLifeStudies(params: {
    companyId: string;
    page?: number;
    limit?: number;
    productId?: string;
    status?: string;
  }) {
    const page = Number(params.page ?? 1);
    const limit = Number(params.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { company_id: params.companyId };
    if (params.productId) where.product_id = params.productId;
    if (params.status) where.status = params.status;

    const [list, total] = await Promise.all([
      this.prisma.shelfLifeStudy.findMany({
        where,
        skip,
        take: limit,
        orderBy: { started_at: 'desc' },
        include: { points: true },
      }),
      this.prisma.shelfLifeStudy.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  async createShelfLifeStudy(input: CreateShelfLifeStudyInput) {
    assertNonEmptyPoints(input.points);
    assertUniquePointCodes(input.points);

    return this.prisma.$transaction(async (tx: TxClient) => {
      return tx.shelfLifeStudy.create({
        data: {
          company_id: input.companyId,
          product_id: input.productId,
          retained_sample_id: input.retainedSampleId ?? null,
          study_type: input.studyType,
          storage_conditions: input.storageConditions as Prisma.InputJsonValue,
          started_at: new Date(input.startedAt),
          planned_ended_at: new Date(input.plannedEndedAt),
          status: 'active',
          points: {
            create: input.points.map((p) => ({
              point_code: p.pointCode,
              sequence: p.sequence,
              planned_at: new Date(p.plannedAt),
              status: 'pending',
            })),
          },
        },
        include: { points: true },
      });
    });
  }

  async attachInspectionRecordToPoint(
    studyId: string,
    companyId: string,
    pointCode: string,
    inspectionRecordId: string,
  ) {
    return this.prisma.$transaction(async (tx: TxClient) => {
      const study = await tx.shelfLifeStudy.findFirst({
        where: { id: studyId, company_id: companyId },
      });

      assertStudyExists(study, studyId);

      const point = await tx.shelfLifeStudyPoint.findFirst({
        where: { shelf_life_study_id: studyId, point_code: pointCode },
      });

      if (!point) {
        throw new BadRequestException(
          `ShelfLifeStudyPoint "${pointCode}" not found in study ${studyId}`,
        );
      }

      if (point.status !== 'pending') {
        throw new BadRequestException(
          `Point "${pointCode}" is "${point.status}" and cannot have an inspection record attached`,
        );
      }

      const ir = await tx.inspectionRecord.findFirst({
        where: { id: inspectionRecordId },
      });

      if (!ir) {
        throw new BadRequestException(
          `InspectionRecord ${inspectionRecordId} not found`,
        );
      }

      if (ir.object_type !== SHELF_LIFE_STUDY_OBJECT_TYPE) {
        throw new BadRequestException(
          `InspectionRecord ${inspectionRecordId} object_type must be "${SHELF_LIFE_STUDY_OBJECT_TYPE}", got "${ir.object_type}"`,
        );
      }

      if (ir.object_id !== studyId) {
        throw new BadRequestException(
          `InspectionRecord ${inspectionRecordId} object_id does not match study ${studyId}`,
        );
      }

      return tx.shelfLifeStudyPoint.update({
        where: { id: point.id },
        data: {
          status: 'done',
          inspection_record_id: inspectionRecordId,
          completed_at: new Date(),
        },
      });
    });
  }

  async skipShelfLifeStudyPoint(
    studyId: string,
    companyId: string,
    pointCode: string,
    skipReason: string,
    skippedBy: string,
  ) {
    if (!skipReason?.trim()) {
      throw new BadRequestException('skip_reason is required to skip a point');
    }

    return this.prisma.$transaction(async (tx: TxClient) => {
      const study = await tx.shelfLifeStudy.findFirst({
        where: { id: studyId, company_id: companyId },
      });

      assertStudyExists(study, studyId);

      const point = await tx.shelfLifeStudyPoint.findFirst({
        where: { shelf_life_study_id: studyId, point_code: pointCode },
      });

      if (!point) {
        throw new BadRequestException(
          `ShelfLifeStudyPoint "${pointCode}" not found in study ${studyId}`,
        );
      }

      if (point.status !== 'pending') {
        throw new BadRequestException(
          `Point "${pointCode}" is "${point.status}" and cannot be skipped`,
        );
      }

      return tx.shelfLifeStudyPoint.update({
        where: { id: point.id },
        data: {
          status: 'skipped',
          skip_reason: skipReason.trim(),
          completed_at: new Date(),
          completed_by: skippedBy,
        },
      });
    });
  }

  async concludeShelfLifeStudy(
    studyId: string,
    companyId: string,
    conclusion: string,
    conclusionBy: string,
  ) {
    assertValidConclusion(conclusion);

    return this.prisma.$transaction(async (tx: TxClient) => {
      const study = await tx.shelfLifeStudy.findFirst({
        where: { id: studyId, company_id: companyId },
        include: { points: true },
      });

      assertStudyExists(study, studyId);

      if (study.status === 'concluded') {
        throw new BadRequestException(`Study ${studyId} is already concluded`);
      }

      const points = study.points as StudyPoint[];

      assertNoPendingPoints(points);
      assertSkippedPointsHaveReason(points);
      assertDonePointsHaveInspectionRecord(points);

      if (conclusion === 'pass') {
        await assertNoFailedInspectionRecords(tx, points);
      }

      return tx.shelfLifeStudy.update({
        where: { id: studyId },
        data: {
          status: 'concluded',
          final_conclusion: conclusion,
          conclusion_by: conclusionBy,
          actual_ended_at: new Date(),
        },
        include: { points: true },
      });
    });
  }
}

async function assertNoFailedInspectionRecords(
  tx: TxClient,
  points: StudyPoint[],
): Promise<void> {
  const irIds = points
    .filter((p) => p.inspection_record_id)
    .map((p) => p.inspection_record_id as string);

  if (irIds.length === 0) {
    return;
  }

  const failedIrs = await tx.inspectionRecord.findMany({
    where: { id: { in: irIds }, overall_result: 'fail' },
    select: { id: true },
  });

  if (failedIrs.length > 0) {
    throw new BadRequestException(
      `Cannot conclude as "pass": ${failedIrs.length} linked inspection record(s) have overall_result="fail"`,
    );
  }
}
