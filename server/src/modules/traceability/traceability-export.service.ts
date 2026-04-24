import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTraceabilityExportDto } from './dto/create-traceability-export.dto';

@Injectable()
export class TraceabilityExportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTraceabilityExportDto, _currentUser: any) {
    return {
      mode: dto.exportMode,
      status: 'ready',
      fileName: `traceability-${dto.sourceQueryHash}.xlsx`,
    };
  }
}
