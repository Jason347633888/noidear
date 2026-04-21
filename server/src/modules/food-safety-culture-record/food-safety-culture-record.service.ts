import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFoodSafetyCultureRecordDto } from './dto/create-food-safety-culture-record.dto';

@Injectable()
export class FoodSafetyCultureRecordService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.foodSafetyCultureRecord.findMany({
      where: { company_id: '1', deleted_at: null },
      orderBy: { conducted_at: 'desc' },
      take: 200,
    });
  }

  async create(dto: CreateFoodSafetyCultureRecordDto) {
    return this.prisma.foodSafetyCultureRecord.create({
      data: {
        ...dto,
        company_id: '1',
        conducted_at: dto.conducted_at ? new Date(dto.conducted_at) : new Date(),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.foodSafetyCultureRecord.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
