import { Injectable } from '@nestjs/common';
import { CreateTraceabilityLinkageDto } from './dto/create-traceability-linkage.dto';

@Injectable()
export class TraceabilityLinkageService {
  async create(dto: CreateTraceabilityLinkageDto, currentUser: any) {
    return {
      actionType: dto.actionType,
      sourceQueryHash: dto.sourceQueryHash,
      requestedBy: currentUser?.id ?? 'system',
      note: dto.note ?? null,
      status: 'created',
    };
  }
}
