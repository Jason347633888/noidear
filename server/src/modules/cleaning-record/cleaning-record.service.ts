import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCleaningRecordDto } from './dto/create-cleaning-record.dto';

@Injectable()
export class CleaningRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCleaningRecordDto, userId: string) {
    return this.prisma.cleaningRecord.create({
      data: {
        ...dto,
        company_id: '1',
        operator_id: userId,
        cleaning_date: new Date(),
      },
    });
  }

  async findAll(targetType?: string) {
    return this.prisma.cleaningRecord.findMany({
      where: targetType ? { target_type: targetType } : {},
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }
}
