import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReworkRecordDto } from './dto/create-rework-record.dto';

@Injectable()
export class ReworkRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReworkRecordDto, companyId: string) {
    return this.prisma.reworkRecord.create({
      data: {
        ...dto,
        company_id: companyId,
        rework_date: new Date(dto.rework_date),
        rework_qty: dto.rework_qty,
      },
    });
  }

  async findAll(companyId: string, startDate?: string, endDate?: string) {
    return this.prisma.reworkRecord.findMany({
      where: {
        company_id: companyId,
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

  async remove(id: string, companyId: string) {
    const record = await this.prisma.reworkRecord.findFirst({
      where: { id, company_id: companyId },
    });
    if (!record) throw new NotFoundException('返工记录不存在');

    return this.prisma.reworkRecord.delete({ where: { id } });
  }
}
