import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCapaDto } from './dto/create-capa.dto';

@Injectable()
export class CorrectiveActionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCapaDto, userId: string) {
    const count = await this.prisma.correctiveAction.count();
    const capa_no = `CAPA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.correctiveAction.create({
      data: { ...dto, company_id: '1', capa_no },
    });
  }

  async findAll(status?: string) {
    return this.prisma.correctiveAction.findMany({
      where: status ? { status } : {},
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async close(id: string, verifiedBy: string) {
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
