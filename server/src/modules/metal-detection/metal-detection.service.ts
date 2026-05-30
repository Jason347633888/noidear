import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NonConformanceService } from '../non-conformance/non-conformance.service';
import { CreateMetalDetectionDto } from './dto/create-metal-detection.dto';

const CLOSED_BATCH_STATUSES = ['completed', 'shipped'] as const;

@Injectable()
export class MetalDetectionService {
  constructor(
    private prisma: PrismaService,
    private ncService: NonConformanceService,
  ) {}

  async create(dto: CreateMetalDetectionDto, userId: string, companyId: string) {
    const batch = await this.prisma.productionBatch.findUnique({
      where: { id: dto.production_batch_id },
      select: { id: true, status: true },
    });

    if (!batch) {
      throw new NotFoundException('生产批次不存在');
    }

    if ((CLOSED_BATCH_STATUSES as readonly string[]).includes(batch.status)) {
      throw new BadRequestException('已完成或已发货的生产批次不能新增金属探测记录');
    }

    if (!dto.overall_pass && !dto.rejection_action?.trim()) {
      throw new BadRequestException('金属探测不合格时必须填写不合格处置措施');
    }

    const log = await this.prisma.metalDetectionLog.create({
      data: {
        ...dto,
        company_id: companyId,
        operator_id: userId,
        tested_at: new Date(),
      },
    });

    if (!log.overall_pass) {
      await this.ncService.create(
        {
          source_type: 'metal_detection_log',
          source_id: log.id,
          nc_type: 'metal_detection_failure',
          description: this.buildFailureDescription(log),
        },
        userId,
        companyId,
      );
    }

    return log;
  }

  async createNonConformanceFromLog(logId: string, userId: string, companyId: string) {
    const log = await this.prisma.metalDetectionLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      throw new NotFoundException('金属探测记录不存在');
    }

    return this.ncService.create(
      {
        source_type: 'metal_detection_log',
        source_id: log.id,
        nc_type: 'metal_detection_failure',
        description: this.buildFailureDescription(log),
      },
      userId,
      companyId,
    );
  }

  async findByBatch(batchId: string) {
    return this.prisma.metalDetectionLog.findMany({
      where: { production_batch_id: batchId },
      orderBy: { created_at: 'desc' },
    });
  }

  private buildFailureDescription(log: {
    id: string;
    fe_test_pass: boolean;
    sus_test_pass: boolean;
    al_test_pass: boolean;
    fe_ball_spec?: string | null;
    sus_ball_spec?: string | null;
    al_ball_spec?: string | null;
    rejection_action?: string | null;
  }): string {
    const failedSpecs: string[] = [];

    if (!log.fe_test_pass && log.fe_ball_spec) {
      failedSpecs.push(`铁球规格 ${log.fe_ball_spec}`);
    }
    if (!log.sus_test_pass && log.sus_ball_spec) {
      failedSpecs.push(`不锈钢球规格 ${log.sus_ball_spec}`);
    }
    if (!log.al_test_pass && log.al_ball_spec) {
      failedSpecs.push(`铝球规格 ${log.al_ball_spec}`);
    }

    const specsText = failedSpecs.length > 0 ? `失败规格：${failedSpecs.join('、')}` : '金属探测未通过';
    const actionText = log.rejection_action ? `；处置措施：${log.rejection_action}` : '';

    return `金属探测不合格：${specsText}${actionText}；记录ID：${log.id}`;
  }
}
