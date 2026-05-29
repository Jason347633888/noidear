import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateWorkshopAreaInput {
  company_id: string;
  code: string;
  name: string;
  type: string;
  parentId?: string;
}

@Injectable()
export class WorkshopAreaService {
  constructor(private readonly prisma: PrismaService) {}

  findActive() {
    return this.prisma.workshopArea.findMany({
      where: { company_id: '1', status: 'active', deleted_at: null },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  create(input: CreateWorkshopAreaInput) {
    const { company_id, code, name, type, parentId } = input;
    return this.prisma.workshopArea.create({
      data: { company_id, code, name, type, parentId },
    });
  }
}
