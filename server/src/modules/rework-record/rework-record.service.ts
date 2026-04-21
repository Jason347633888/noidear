import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReworkRecordDto } from './dto/create-rework-record.dto';

@Injectable()
export class ReworkRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReworkRecordDto) {
    return this.prisma.reworkRecord.create({
      data: {
        ...dto,
        company_id: '1',
        rework_date: new Date(dto.rework_date),
        rework_qty: dto.rework_qty,
      },
    });
  }

  async findAll(startDate?: string, endDate?: string) {
    return this.prisma.reworkRecord.findMany({
      where: {
        company_id: '1',
        ...(startDate || endDate
          ? {
              rework_date: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      },
      orderBy: { rework_date: 'desc' },
      take: 200,
    });
  }

  async remove(id: string) {
    return this.prisma.reworkRecord.delete({ where: { id } });
  }
}
