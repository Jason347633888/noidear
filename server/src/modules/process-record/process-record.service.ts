import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcessRecordDto } from './dto/create-process-record.dto';

@Injectable()
export class ProcessRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProcessRecordDto, userId: string) {
    return this.prisma.processMonitorRecord.create({
      data: {
        ...dto,
        company_id: '1',
        operator_id: userId,
        measured_at: new Date(),
      },
    });
  }

  async findByBatch(batchId: string) {
    return this.prisma.processMonitorRecord.findMany({
      where: { production_batch_id: batchId },
      orderBy: { created_at: 'desc' },
    });
  }
}
