import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDocumentIssuanceDto } from './dto/create-document-issuance.dto';

@Injectable()
export class DocumentIssuanceService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDocumentIssuanceDto) {
    if (!dto.document_id) {
      throw new BadRequestException('受控文件不能为空');
    }

    const document = await this.prisma.document.findFirst({
      where: { id: dto.document_id, deletedAt: null },
      select: { id: true, title: true, doc_code: true, number: true },
    });

    if (!document) {
      throw new BadRequestException('受控文件不存在或已删除');
    }

    const {
      document_name: _ignoredDocumentName,
      document_code: _ignoredDocumentCode,
      ...issuanceData
    } = dto;

    return this.prisma.documentIssuance.create({
      data: {
        ...issuanceData,
        document_name: document.title,
        document_code: document.doc_code ?? document.number,
        company_id: '1',
        quantity: dto.quantity ?? 1,
        issued_at: dto.issued_at ? new Date(dto.issued_at) : new Date(),
      },
    });
  }

  async findAll() {
    return this.prisma.documentIssuance.findMany({
      where: { deleted_at: null },
      include: {
        document: {
          select: { id: true, title: true, number: true, doc_code: true, status: true, versionNo: true },
        },
      },
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
