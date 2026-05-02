import { BadRequestException, Injectable } from '@nestjs/common';
import { ProductRecallService } from '../product-recall/product-recall.service';
import { CreateTraceabilityActionDto as CreateTraceabilityLinkageDto } from './dto/create-traceability-linkage.dto';

@Injectable()
export class TraceabilityLinkageService {
  constructor(private readonly productRecallService: ProductRecallService) {}

  async create(dto: CreateTraceabilityLinkageDto, currentUser: any) {
    const status = dto.actionType === 'recallAssessment' ? 'pendingReview' : 'created';
    let productRecall: { id: string; recall_no: string } | null = null;

    if (dto.actionType === 'recallAssessment') {
      if (!currentUser?.companyId) {
        throw new BadRequestException('recallAssessment requires authenticated user with companyId');
      }
      productRecall = await this.productRecallService.create(
        {
          title: '追溯召回评估',
          reason: dto.note ?? '追溯查询触发召回评估',
          source_query_ref: dto.sourceQueryRef,
          risk_level: 'high',
        },
        { id: currentUser.id ?? 'system', companyId: currentUser.companyId },
      );
    }

    return {
      actionType: dto.actionType,
      sourceQueryRef: dto.sourceQueryRef,
      requestedBy: currentUser?.id ?? 'system',
      note: dto.note ?? null,
      status,
      productRecall,
      writeback: {
        sourceQueryRef: dto.sourceQueryRef,
        linkedAt: new Date().toISOString(),
      },
    };
  }
}
