import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExternalPartyDto } from './dto/create-external-party.dto';
import { UpdateExternalPartyDto } from './dto/update-external-party.dto';

@Injectable()
export class ExternalPartyService {
  constructor(private prisma: PrismaService) {}

  async findAll(partyType?: string) {
    return this.prisma.externalParty.findMany({
      where: {
        company_id: '1',
        deleted_at: null,
        ...(partyType ? { party_type: partyType } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  async findOne(id: string) {
    return this.prisma.externalParty.findFirst({
      where: { id, company_id: '1', deleted_at: null },
    });
  }

  async create(dto: CreateExternalPartyDto) {
    return this.prisma.externalParty.create({
      data: {
        ...dto,
        company_id: '1',
        status: dto.status ?? 'active',
      },
    });
  }

  async update(id: string, dto: UpdateExternalPartyDto) {
    return this.prisma.externalParty.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: string) {
    return this.prisma.externalParty.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
