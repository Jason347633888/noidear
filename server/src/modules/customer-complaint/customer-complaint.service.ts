import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';

@Injectable()
export class CustomerComplaintService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateComplaintDto, companyId: string) {
    const count = await this.prisma.customerComplaint.count({ where: { company_id: companyId } });
    const complaint_no = `CC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.customerComplaint.create({
      data: { ...dto, company_id: companyId, complaint_no, received_at: new Date() },
    });
  }

  async findAll(companyId: string, status?: string) {
    return this.prisma.customerComplaint.findMany({
      where: { company_id: companyId, ...(status ? { status } : {}) },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async resolve(id: string, resolution: string, companyId: string) {
    const complaint = await this.prisma.customerComplaint.findFirst({
      where: { id, company_id: companyId },
    });
    if (!complaint) throw new NotFoundException('客户投诉不存在');

    return this.prisma.customerComplaint.update({
      where: { id },
      data: { resolution, status: 'closed', closed_at: new Date() },
    });
  }
}
