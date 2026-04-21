import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetLoanRecordDto } from './dto/create-asset-loan-record.dto';

@Injectable()
export class AssetLoanRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAssetLoanRecordDto) {
    return this.prisma.assetLoanRecord.create({
      data: {
        ...dto,
        company_id: '1',
        borrow_at: dto.borrow_at ? new Date(dto.borrow_at) : new Date(),
        expected_return: dto.expected_return ? new Date(dto.expected_return) : undefined,
        status: dto.status ?? 'borrowed',
      },
    });
  }

  async findAll() {
    return this.prisma.assetLoanRecord.findMany({
      where: { deleted_at: null },
      orderBy: { borrow_at: 'desc' },
      take: 200,
    });
  }

  async updateReturn(id: string) {
    return this.prisma.assetLoanRecord.update({
      where: { id },
      data: {
        actual_return: new Date(),
        status: 'returned',
      },
    });
  }

  async remove(id: string) {
    return this.prisma.assetLoanRecord.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
