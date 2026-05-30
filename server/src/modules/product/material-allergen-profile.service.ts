import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMaterialAllergenProfileDto } from './dto/create-material-allergen-profile.dto';

const ACTIVE_STATUS = 'active';
const RETIRED_STATUS = 'retired';

@Injectable()
export class MaterialAllergenProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async createMaterialAllergenProfile(
    dto: CreateMaterialAllergenProfileDto,
    companyId: string,
  ) {
    return this.prisma.materialAllergenProfile.create({
      data: {
        company_id: companyId,
        material_id: dto.material_id,
        supplier_id: dto.supplier_id ?? null,
        allergen_code: dto.allergen_code,
        allergen_name: dto.allergen_name,
        contains_allergen: dto.contains_allergen,
        cross_contact_risk: dto.cross_contact_risk ?? null,
        evidence_file_id: dto.evidence_file_id ?? null,
        effective_from: dto.effective_from,
        effective_to: dto.effective_to ?? null,
        status: ACTIVE_STATUS,
      },
    });
  }

  async listActiveProfiles(
    materialId: string,
    companyId: string,
    supplierId?: string,
  ) {
    const where: Record<string, unknown> = {
      company_id: companyId,
      material_id: materialId,
      status: ACTIVE_STATUS,
    };

    if (supplierId !== undefined) {
      where.supplier_id = supplierId;
    }

    return this.prisma.materialAllergenProfile.findMany({
      where,
      orderBy: { effective_from: 'desc' },
    });
  }

  async retireProfile(id: string, companyId: string) {
    const profile = await this.prisma.materialAllergenProfile.findUnique({
      where: { id },
    });

    if (!profile || profile.company_id !== companyId) {
      throw new NotFoundException(`过敏原档案 ${id} 不存在`);
    }

    if (profile.status === RETIRED_STATUS) {
      throw new BadRequestException(`过敏原档案 ${id} 已停用，无需重复操作`);
    }

    return this.prisma.materialAllergenProfile.update({
      where: { id },
      data: {
        status: RETIRED_STATUS,
        effective_to: new Date(),
      },
    });
  }

  async listAffectedProductsForAllergenChange(
    materialId: string,
    companyId: string,
  ) {
    const recipes = await this.prisma.recipe.findMany({
      where: {
        company_id: companyId,
        status: ACTIVE_STATUS,
        lines: {
          some: { material_id: materialId },
        },
      },
      include: {
        product: {
          select: { id: true, name: true, company_id: true },
        },
      },
    });

    const seen = new Set<string>();
    return recipes
      .map((r) => r.product)
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
  }
}
