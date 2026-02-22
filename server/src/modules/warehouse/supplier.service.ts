import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  QuerySupplierDto,
  CreateQualificationDto,
} from './dto/supplier.dto';
import * as dayjs from 'dayjs';

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto) {
    try {
      return await this.prisma.supplier.create({
        data: createSupplierDto,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Supplier code already exists');
      }
      throw error;
    }
  }

  async findAll(query: QuerySupplierDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(search, status);

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  private buildWhereClause(search?: string, status?: string) {
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { supplierCode: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    return where;
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier || supplier.deletedAt) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    await this.findOne(id);

    return this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
    });
  }

  async disable(id: string) {
    await this.findOne(id);

    return this.prisma.supplier.update({
      where: { id },
      data: { status: 'disabled' },
    });
  }

  async addQualification(supplierId: string, createQualificationDto: CreateQualificationDto) {
    await this.findOne(supplierId);

    return this.prisma.supplierQualification.create({
      data: {
        supplierId,
        ...createQualificationDto,
      },
    });
  }

  async getQualifications(supplierId: string) {
    await this.findOne(supplierId);

    return this.prisma.supplierQualification.findMany({
      where: { supplierId },
      orderBy: { validUntil: 'asc' },
    });
  }

  async checkExpiringQualifications(currentDate: Date = new Date()) {
    const thirtyDaysLater = dayjs(currentDate).add(30, 'days').toDate();

    return this.prisma.supplierQualification.findMany({
      where: {
        status: 'valid',
        validUntil: {
          gte: currentDate,
          lte: thirtyDaysLater,
        },
      },
      include: {
        supplier: true,
      },
    });
  }
}
