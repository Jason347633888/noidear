import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDrillDto } from './dto/create-drill.dto';

@Injectable()
export class EmergencyDrillService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDrillDto, _userId: string) {
    return this.prisma.emergencyDrillRecord.create({
      data: {
        ...dto,
        company_id: '1',
        drill_date: new Date(dto.drill_date),
      },
    });
  }

  async findAll() {
    return this.prisma.emergencyDrillRecord.findMany({
      where: { deleted_at: null },
      orderBy: { drill_date: 'desc' },
    });
  }
}
