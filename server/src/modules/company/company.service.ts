import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto, UpsertCompanyProfileDto } from './dto/company.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  createTenant(dto: CreateTenantDto) {
    return this.prisma.companyTenant.create({
      data: {
        name: dto.name,
        timezone: dto.timezone ?? 'Asia/Shanghai',
        retentionPolicy: 'default_food_safety',
        status: 'active',
      },
    });
  }

  async getTenant(companyId: string) {
    const tenant = await this.prisma.companyTenant.findUnique({
      where: { id: companyId },
      include: { profile: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Company tenant ${companyId} not found`);
    }
    return tenant;
  }

  upsertProfile(companyId: string, dto: UpsertCompanyProfileDto) {
    return this.prisma.companyProfile.upsert({
      where: { company_id: companyId },
      create: { company_id: companyId, ...dto },
      update: { ...dto },
    });
  }
}
