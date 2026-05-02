import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { QualityNumberSequenceService } from '../quality-number-sequence/quality-number-sequence.service';

@Injectable()
export class WorkflowTriggersService {
  private readonly logger = new Logger(WorkflowTriggersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequence: QualityNumberSequenceService,
  ) {}

  @OnEvent('incoming-inspection.created')
  async handleInspectionFail(payload: {
    id: string;
    overall_result: string;
    material_batch_id: string;
    company_id: string;
  }) {
    if (payload.overall_result !== 'fail') return;

    const materialBatch = await this.prisma.materialBatch.findUnique({
      where: { id: payload.material_batch_id },
      select: { id: true, deletedAt: true },
    });

    if (!materialBatch || materialBatch.deletedAt != null) {
      this.logger.error(
        `[WorkflowTrigger] 来料检验不合格未创建不合格品处置单：物料批次不存在 ${payload.material_batch_id}`,
      );
      return;
    }

    try {
      const nc_no = await this.numberSequence.generateNonConformanceNo(payload.company_id);

      await this.prisma.nonConformance.create({
        data: {
          company_id: payload.company_id,
          nc_no,
          source_type: 'material_batch',
          source_id: payload.material_batch_id,
          status: 'open',
          description: `来料检验不合格，自动创建 - 检验单ID: ${payload.id}`,
          discovered_at: new Date(),
        },
      });

      this.logger.log(`[WorkflowTrigger] 来料检验不合格 → 已创建不合格品处置单 ${nc_no}，来源检验单: ${payload.id}`);
    } catch (error) {
      this.logger.error(`[WorkflowTrigger] 创建不合格品处置单失败: ${(error as Error).message}`);
    }
  }

  @OnEvent('change-event.status-changed')
  async handleChangeStatusChange(payload: {
    id: string;
    status: string;
    company_id: string;
  }) {
    if (payload.status !== 'compliance_review') return;

    try {
      await this.prisma.changeComplianceRecord.create({
        data: {
          company_id: payload.company_id,
          change_event_id: payload.id,
          legal_compliance: true,
        },
      });

      this.logger.log(`[WorkflowTrigger] 变更提交合规评估 → 已创建合规评估记录，变更单ID: ${payload.id}`);
    } catch (error) {
      this.logger.error(`[WorkflowTrigger] 创建合规评估记录失败: ${(error as Error).message}`);
    }
  }
}
