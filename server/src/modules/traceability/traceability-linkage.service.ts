import { Injectable } from '@nestjs/common';
import { CreateTraceabilityLinkageDto } from './dto/create-traceability-linkage.dto';

@Injectable()
export class TraceabilityLinkageService {
  async create(dto: CreateTraceabilityLinkageDto, currentUser: any) {
    const status = dto.actionType === 'recallAssessment' ? 'pendingReview' : 'created';

    return {
      actionType: dto.actionType,
      sourceQueryHash: dto.sourceQueryHash,
      requestedBy: currentUser?.id ?? 'system',
      note: dto.note ?? null,
      status,
      writeback: {
        sourceQueryHash: dto.sourceQueryHash,
        linkedAt: new Date().toISOString(),
      },
    };
  }
}
