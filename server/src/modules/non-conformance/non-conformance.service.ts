import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNcDto, DisposeNcDto } from './dto/create-nc.dto';

@Injectable()
export class NonConformanceService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNcDto, userId: string) {
    const count = await this.prisma.nonConformance.count();
    const nc_no = `NC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.nonConformance.create({
      data: {
        ...dto,
        company_id: '1',
        nc_no,
        discovered_by: userId,
        discovered_at: new Date(),
      },
    });
  }

  async findAll(status?: string) {
    return this.prisma.nonConformance.findMany({
      where: status ? { status } : {},
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async dispose(id: string, dto: DisposeNcDto, userId: string) {
    return this.prisma.nonConformance.update({
      where: { id },
      data: {
        disposition: dto.disposition,
        disposition_by: userId,
        disposition_at: new Date(),
        status: 'dispositioned',
      },
    });
  }
}
