import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { OwnershipContext } from '../module-access/ownership-context';

@Injectable()
export class CustomerComplaintService {
  constructor(private prisma: PrismaService) {}

  /**
   * Ownership-scoped list.
   * TODO(Task 46): CustomerComplaint lacks createdById FK.
   *   user → [] (empty-set fallback until Task 46)
   *   leader/admin → all (no ownership filter yet)
   */
  async listForOwnership(ownership: OwnershipContext) {
    if (ownership.roleCode === 'user') return [];
    return this.prisma.customerComplaint.findMany({
      where: {},
      orderBy: { created_at: 'desc' },
    });
  }

  async create(dto: CreateComplaintDto, companyId: string) {
    if (!dto.production_batch_id) {
      throw new BadRequestException('生产批次不能为空');
    }

    const productionBatch = await this.prisma.productionBatch.findUnique({
      where: { id: dto.production_batch_id },
      select: { id: true, productId: true },
    });

    if (!productionBatch || !productionBatch.productId) {
      throw new BadRequestException('生产批次不存在或不属于当前公司');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productionBatch.productId, company_id: companyId },
      select: { id: true },
    });

    if (!product) {
      throw new BadRequestException('生产批次不存在或不属于当前公司');
    }

    if (!dto.customer_id) {
      throw new BadRequestException('客户不能为空');
    }

    const customer = await this.prisma.externalParty.findFirst({
      where: {
        id: dto.customer_id,
        company_id: companyId,
        party_type: 'customer',
        status: 'active',
        deleted_at: null,
      },
      select: { id: true, name: true },
    });

    if (!customer) {
      throw new BadRequestException('客户不存在或不可用');
    }

    const count = await this.prisma.customerComplaint.count({ where: { company_id: companyId } });
    const complaint_no = `CC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.customerComplaint.create({
      data: {
        company_id: companyId,
        complaint_no,
        customer_id: customer.id,
        customer_name: customer.name,
        production_batch_id: dto.production_batch_id,
        complaint_type: dto.complaint_type,
        description: dto.description,
        received_at: new Date(),
      },
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
