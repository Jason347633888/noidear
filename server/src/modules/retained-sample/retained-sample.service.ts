import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRetainedSampleDto,
  ListRetainedSamplesDto,
} from './dto/retained-sample.dto';

const SAMPLE_TYPES_REQUIRING_MATERIAL_BATCH = ['material', 'packaging'] as const;

const RETENTION_PERIOD_REGEX = /^(\d+)(d|w|m|y)$/;
const DAYS_IN_PERIOD: Record<string, number> = {
  d: 1,
  w: 7,
  m: 30,
  y: 365,
};

function deriveExpiry(retainedAt: Date, period: string): Date {
  const match = RETENTION_PERIOD_REGEX.exec(period);
  if (!match) {
    throw new BadRequestException(
      `Invalid retention_period format "${period}". Expected format: <number><d|w|m|y> (e.g. "90d", "6m")`,
    );
  }
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const daysToAdd = amount * DAYS_IN_PERIOD[unit];
  const expiry = new Date(retainedAt.getTime());
  expiry.setDate(expiry.getDate() + daysToAdd);
  return expiry;
}

function validateSourceIdentity(dto: CreateRetainedSampleDto): void {
  if (dto.sample_type === 'product') {
    if (!dto.product_id && !dto.production_batch_id) {
      throw new BadRequestException(
        'Product-type retained samples require product_id or production_batch_id',
      );
    }
    return;
  }

  if (
    SAMPLE_TYPES_REQUIRING_MATERIAL_BATCH.includes(
      dto.sample_type as (typeof SAMPLE_TYPES_REQUIRING_MATERIAL_BATCH)[number],
    )
  ) {
    if (!dto.material_batch_id) {
      throw new BadRequestException(
        `${dto.sample_type}-type retained samples require material_batch_id`,
      );
    }
  }
}

@Injectable()
export class RetainedSampleService {
  constructor(private readonly prisma: PrismaService) {}

  async createRetainedSample(dto: CreateRetainedSampleDto, companyId: string) {
    validateSourceIdentity(dto);

    const retainedAt =
      dto.retained_at instanceof Date ? dto.retained_at : new Date(dto.retained_at);

    const expiresAt =
      dto.expires_at != null
        ? dto.expires_at instanceof Date
          ? dto.expires_at
          : new Date(dto.expires_at)
        : dto.retention_period
          ? deriveExpiry(retainedAt, dto.retention_period)
          : undefined;

    return this.prisma.retainedSample.create({
      data: {
        company_id: companyId,
        sample_type: dto.sample_type,
        product_id: dto.product_id ?? null,
        material_batch_id: dto.material_batch_id ?? null,
        production_batch_id: dto.production_batch_id ?? null,
        sample_code: dto.sample_code,
        sample_qty: dto.sample_qty,
        unit: dto.unit,
        retained_at: retainedAt,
        retention_period: dto.retention_period ?? null,
        expires_at: expiresAt ?? null,
        storage_condition: dto.storage_condition ?? null,
        storage_area_id: dto.storage_area_id ?? null,
        appeared_in_source_forms: dto.appeared_in_source_forms ?? [],
        source_form_version: dto.source_form_version ?? null,
        source_form_field_group: dto.source_form_field_group ?? null,
      },
      include: { inspections: true },
    });
  }

  async disposeRetainedSample(
    id: string,
    companyId: string,
    disposalAction: string,
    disposedAt: Date,
  ) {
    const sample = await this.prisma.retainedSample.findFirst({
      where: { id, company_id: companyId },
    });

    if (!sample) {
      throw new NotFoundException(`Retained sample ${id} not found`);
    }

    if (sample.status === 'disposed') {
      throw new BadRequestException(
        `Retained sample ${id} is already disposed and is read-only`,
      );
    }

    return this.prisma.retainedSample.update({
      where: { id },
      data: {
        status: 'disposed',
        disposal_action: disposalAction,
        disposed_at: disposedAt,
      },
      include: { inspections: true },
    });
  }

  async listRetainedSamples(query: ListRetainedSamplesDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      company_id: query.company_id,
    };

    if (query.sample_type) {
      where.sample_type = query.sample_type;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.production_batch_id) {
      where.production_batch_id = query.production_batch_id;
    }

    if (query.material_batch_id) {
      where.material_batch_id = query.material_batch_id;
    }

    const [list, total] = await Promise.all([
      this.prisma.retainedSample.findMany({
        where,
        skip,
        take: limit,
        orderBy: { retained_at: 'desc' },
        include: { inspections: true },
      }),
      this.prisma.retainedSample.count({ where }),
    ]);

    return { list, total, page, limit };
  }
}
