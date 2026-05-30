import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SetProductRiskZoneDto } from './dto/set-product-risk-zone.dto';

const ACTIVE_STATUS = 'active';
const RETIRED_STATUS = 'retired';

@Injectable()
export class ProductRiskZoneService {
  constructor(private readonly prisma: PrismaService) {}

  async setProductRiskZone(
    productId: string,
    companyId: string,
    dto: SetProductRiskZoneDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, company_id: companyId, deleted_at: null },
    });

    if (!product) {
      throw new NotFoundException(`产品 ${productId} 不存在`);
    }

    await this.prisma.productRiskZone.updateMany({
      where: { product_id: productId, company_id: companyId, status: ACTIVE_STATUS },
      data: { status: RETIRED_STATUS, effective_to: new Date() },
    });

    return this.prisma.productRiskZone.create({
      data: {
        company_id: companyId,
        product_id: productId,
        risk_zone: dto.risk_zone,
        basis: dto.basis ?? null,
        effective_from: new Date(dto.effective_from),
        effective_to: dto.effective_to ? new Date(dto.effective_to) : null,
        status: ACTIVE_STATUS,
        approvalInstanceId: dto.approvalInstanceId ?? null,
      },
    });
  }

  async getCurrentProductRiskZone(productId: string, companyId: string) {
    return this.prisma.productRiskZone.findFirst({
      where: { product_id: productId, company_id: companyId, status: ACTIVE_STATUS },
      orderBy: { effective_from: 'desc' },
    });
  }

  async listProductRiskZoneHistory(productId: string, companyId: string) {
    return this.prisma.productRiskZone.findMany({
      where: { product_id: productId, company_id: companyId },
      orderBy: { effective_from: 'desc' },
    });
  }
}
