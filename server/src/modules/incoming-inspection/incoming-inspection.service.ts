import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';

@Injectable()
export class IncomingInspectionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInspectionDto, companyId: number, inspectorId: string) {
    return this.prisma.incomingInspection.create({
      data: {
        company_id: companyId,
        material_batch_id: dto.material_batch_id,
        inspected_at: new Date(),
        inspector_id: inspectorId,
        overall_result: dto.overall_result,
        sample_qty: dto.sample_qty,
        sample_unit: dto.sample_unit,
        disposition: dto.disposition,
        notes: dto.notes,
        results: {
          create: dto.results,
        },
      },
      include: { results: true },
    });
  }

  async findByBatch(materialBatchId: string, companyId: number) {
    return this.prisma.incomingInspection.findMany({
      where: { material_batch_id: materialBatchId, company_id: companyId },
      include: { results: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findAll(companyId: number) {
    return this.prisma.incomingInspection.findMany({
      where: { company_id: companyId },
      include: {
        results: true,
        material_batch: { include: { material: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }
}
