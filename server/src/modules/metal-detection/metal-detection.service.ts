import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMetalDetectionDto } from './dto/create-metal-detection.dto';

@Injectable()
export class MetalDetectionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMetalDetectionDto, userId: string) {
    return this.prisma.metalDetectionLog.create({
      data: {
        ...dto,
        company_id: '1',
        operator_id: userId,
        tested_at: new Date(),
      },
    });
  }

  async findByBatch(batchId: string) {
    return this.prisma.metalDetectionLog.findMany({
      where: { production_batch_id: batchId },
      orderBy: { created_at: 'desc' },
    });
  }
}
