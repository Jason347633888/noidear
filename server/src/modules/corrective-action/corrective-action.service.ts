import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCapaDto } from './dto/create-capa.dto';

@Injectable()
export class CorrectiveActionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCapaDto, userId: string, companyId: string) {
    const count = await this.prisma.correctiveAction.count({ where: { company_id: companyId } });
    const capa_no = `CAPA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.correctiveAction.create({
      data: { ...dto, company_id: companyId, capa_no },
    });
  }

  async findAll(companyId: string, status?: string) {
    return this.prisma.correctiveAction.findMany({
      where: { company_id: companyId, ...(status ? { status } : {}) },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async findById(id: string, companyId: string) {
    const capa = await this.prisma.correctiveAction.findFirst({ where: { id, company_id: companyId } });
    if (!capa) throw new NotFoundException('纠正措施不存在');
    return capa;
  }

  async updateStatus(id: string, status: string, companyId: string) {
    await this.findById(id, companyId);
    return this.prisma.correctiveAction.update({
      where: { id },
      data: { status },
    });
  }

  async close(id: string, verifiedBy: string, companyId: string) {
    await this.findById(id, companyId);
    return this.prisma.correctiveAction.update({
      where: { id },
      data: {
        status: 'closed',
        verified_by: verifiedBy,
        verified_at: new Date(),
        closed_at: new Date(),
      },
    });
  }
}
