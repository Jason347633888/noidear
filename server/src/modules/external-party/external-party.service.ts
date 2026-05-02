import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExternalPartyDto } from './dto/create-external-party.dto';
import { UpdateExternalPartyDto } from './dto/update-external-party.dto';

@Injectable()
export class ExternalPartyService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, partyType?: string) {
    return this.prisma.externalParty.findMany({
      where: {
        company_id: companyId,
        deleted_at: null,
        ...(partyType ? { party_type: partyType } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  async findOne(id: string, companyId: string) {
    const party = await this.prisma.externalParty.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
    });

    if (!party) {
      throw new NotFoundException('外部方不存在或不属于当前公司');
    }

    return party;
  }

  async create(companyId: string, dto: CreateExternalPartyDto) {
    return this.prisma.externalParty.create({
      data: {
        ...dto,
        company_id: companyId,
        status: dto.status ?? 'active',
      },
    });
  }

  async update(id: string, companyId: string, dto: UpdateExternalPartyDto) {
    const result = await this.prisma.externalParty.updateMany({
      where: { id, company_id: companyId, deleted_at: null },
      data: { ...dto },
    });

    if (result.count === 0) {
      throw new NotFoundException('外部方不存在或不属于当前公司');
    }

    return this.prisma.externalParty.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
    });
  }

  async remove(id: string, companyId: string) {
    const result = await this.prisma.externalParty.updateMany({
      where: { id, company_id: companyId, deleted_at: null },
      data: { deleted_at: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundException('外部方不存在或不属于当前公司');
    }

    return this.prisma.externalParty.findFirst({
      where: { id, company_id: companyId },
    });
  }
}
