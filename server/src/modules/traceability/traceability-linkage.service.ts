import { Injectable } from '@nestjs/common';
import { CreateTraceabilityActionDto as CreateTraceabilityLinkageDto } from './dto/create-traceability-linkage.dto';

@Injectable()
export class TraceabilityLinkageService {
  async create(dto: CreateTraceabilityLinkageDto, currentUser: any) {
    const status = dto.actionType === 'recallAssessment' ? 'pendingReview' : 'created';

    return {
      actionType: dto.actionType,
      sourceQueryRef: dto.sourceQueryRef,
      requestedBy: currentUser?.id ?? 'system',
      note: dto.note ?? null,
      status,
      writeback: {
        sourceQueryRef: dto.sourceQueryRef,
        linkedAt: new Date().toISOString(),
      },
    };
  }
}
