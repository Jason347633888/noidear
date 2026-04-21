import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';

@Injectable()
export class CustomerComplaintService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateComplaintDto) {
    const count = await this.prisma.customerComplaint.count();
    const complaint_no = `CC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.customerComplaint.create({
      data: { ...dto, company_id: '1', complaint_no, received_at: new Date() },
    });
  }

  async findAll(status?: string) {
    return this.prisma.customerComplaint.findMany({
      where: status ? { status } : {},
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async resolve(id: string, resolution: string) {
    return this.prisma.customerComplaint.update({
      where: { id },
      data: { resolution, status: 'closed', closed_at: new Date() },
    });
  }
}
