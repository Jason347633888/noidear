import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEnvironmentRecordDto } from './dto/create-environment-record.dto';

@Injectable()
export class EnvironmentRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEnvironmentRecordDto, userId: string) {
    return this.prisma.environmentRecord.create({
      data: {
        ...dto,
        company_id: '1',
        operator_id: userId,
        measured_at: new Date(),
      },
    });
  }

  async findAll(startDate?: string, endDate?: string) {
    return this.prisma.environmentRecord.findMany({
      where: {
        ...(startDate || endDate
          ? {
              measured_at: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      },
      orderBy: { measured_at: 'desc' },
      take: 200,
    });
  }
}
