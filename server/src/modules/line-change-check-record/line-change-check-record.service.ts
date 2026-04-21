import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLineChangeCheckRecordDto } from './dto/create-line-change-check-record.dto';

@Injectable()
export class LineChangeCheckRecordService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.lineChangeCheckRecord.findMany({
      where: { company_id: '1', deleted_at: null },
      orderBy: { check_date: 'desc' },
      take: 200,
    });
  }

  async create(dto: CreateLineChangeCheckRecordDto) {
    return this.prisma.lineChangeCheckRecord.create({
      data: {
        ...dto,
        company_id: '1',
        check_date: dto.check_date ? new Date(dto.check_date) : new Date(),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.lineChangeCheckRecord.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
