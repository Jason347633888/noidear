import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDocumentIssuanceDto } from './dto/create-document-issuance.dto';

@Injectable()
export class DocumentIssuanceService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDocumentIssuanceDto) {
    return this.prisma.documentIssuance.create({
      data: {
        ...dto,
        company_id: '1',
        quantity: dto.quantity ?? 1,
        issued_at: dto.issued_at ? new Date(dto.issued_at) : new Date(),
      },
    });
  }

  async findAll() {
    return this.prisma.documentIssuance.findMany({
      where: { deleted_at: null },
      orderBy: { issued_at: 'desc' },
      take: 200,
    });
  }

  async remove(id: string) {
    return this.prisma.documentIssuance.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
