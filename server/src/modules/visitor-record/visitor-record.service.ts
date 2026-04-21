import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVisitorDto } from './dto/create-visitor.dto';

@Injectable()
export class VisitorRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVisitorDto, userId: string) {
    return this.prisma.visitorRecord.create({
      data: {
        ...dto,
        company_id: '1',
        visit_date: new Date(dto.visit_date),
        created_by: userId,
      },
    });
  }

  async findAll(date?: string) {
    let where: Record<string, unknown> = { deleted_at: null };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where = {
        ...where,
        visit_date: {
          gte: start,
          lte: end,
        },
      };
    }

    return this.prisma.visitorRecord.findMany({
      where,
      orderBy: { visit_date: 'desc' },
    });
  }
}
