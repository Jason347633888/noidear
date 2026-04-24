import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTraceabilityExportDto } from './dto/create-traceability-export.dto';

@Injectable()
export class TraceabilityExportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTraceabilityExportDto, currentUser: any) {
    if (dto.exportMode === 'simple') {
      return {
        mode: 'simple' as const,
        status: 'ready',
        fileName: `traceability-${dto.sourceQueryRef}.xlsx`,
      };
    }

    return this.prisma.traceabilitySnapshot.create({
      data: {
        sourceQueryHash: dto.sourceQueryRef,
        exportMode: dto.exportMode,
        requesterId: currentUser.id,
        summary: { queued: true },
      },
    });
  }
}
