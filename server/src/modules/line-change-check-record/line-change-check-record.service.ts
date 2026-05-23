import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLineChangeCheckRecordDto } from './dto/create-line-change-check-record.dto';
import { OwnershipContext } from '../module-access/ownership-context';
import { userIdsInDepts } from '../module-access/ownership-helpers';

@Injectable()
export class LineChangeCheckRecordService {
  constructor(private prisma: PrismaService) {}

  async findAll(ownership?: OwnershipContext) {
    const where: Record<string, unknown> = { company_id: '1', deleted_at: null };

    // Ownership scoping — LineChangeCheckRecord.inspector_id is the user FK
    if (ownership && ownership.roleCode !== 'admin') {
      if (ownership.roleCode === 'user') {
        where['inspector_id'] = ownership.userId;
      } else if (ownership.roleCode === 'leader') {
        const memberIds = await userIdsInDepts(this.prisma, ownership.managedDepartmentIds);
        if (memberIds.length === 0) return [];
        where['inspector_id'] = { in: memberIds };
      }
    }

    return this.prisma.lineChangeCheckRecord.findMany({
      where,
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
