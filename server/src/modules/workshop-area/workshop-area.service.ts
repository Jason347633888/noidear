import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkshopAreaService {
  constructor(private readonly prisma: PrismaService) {}

  findActive() {
    return this.prisma.workshopArea.findMany({
      where: { company_id: '1', status: 'active', deleted_at: null },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }
}
