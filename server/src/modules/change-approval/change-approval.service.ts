import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChangeApprovalDto } from './dto/create-change-approval.dto';

@Injectable()
export class ChangeApprovalService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateChangeApprovalDto, userId: string) {
    return this.prisma.changeApproval.create({
      data: {
        company_id: '1',
        change_event_id: dto.change_event_id,
        approver_id: dto.approver_id ?? userId,
        decision: dto.decision ?? 'pending',
        comments: dto.comments,
        approved_at: dto.approved_at ? new Date(dto.approved_at) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.changeApproval.findMany({
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  async findByEvent(changeEventId: string) {
    return this.prisma.changeApproval.findMany({
      where: { change_event_id: changeEventId },
      orderBy: { created_at: 'desc' },
    });
  }

  async remove(id: string) {
    return this.prisma.changeApproval.delete({ where: { id } });
  }
}
