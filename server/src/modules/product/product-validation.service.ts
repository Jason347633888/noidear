import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductValidationRecordDto } from './dto/create-product-validation-record.dto';
import { ConcludeValidationDto } from './dto/conclude-validation.dto';

const VALID_CONCLUSIONS = ['pass', 'fail', 'conditional'] as const;
type ValidConclusion = (typeof VALID_CONCLUSIONS)[number];

@Injectable()
export class ProductValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async createValidationRecord(
    companyId: string,
    dto: CreateProductValidationRecordDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.product_id, company_id: companyId, deleted_at: null },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`产品 ${dto.product_id} 不存在`);
    }

    if (dto.inspection_record_id) {
      await this.validateInspectionRecordBelongsToCompany(
        dto.inspection_record_id,
        companyId,
      );
    }

    return this.prisma.productValidationRecord.create({
      data: {
        company_id: companyId,
        product_id: dto.product_id,
        recipe_id: dto.recipe_id ?? null,
        validation_type: dto.validation_type,
        inspection_record_id: dto.inspection_record_id ?? null,
        change_event_id: dto.change_event_id ?? null,
        conclusion: 'pending',
        evidence_file_id: dto.evidence_file_id ?? null,
      },
    });
  }

  async concludeValidation(
    recordId: string,
    companyId: string,
    dto: ConcludeValidationDto,
  ) {
    const record = await this.prisma.productValidationRecord.findUnique({
      where: { id: recordId },
    });

    if (!record || record.company_id !== companyId) {
      throw new NotFoundException(`产品验证记录 ${recordId} 不存在`);
    }

    if (record.conclusion !== 'pending') {
      throw new BadRequestException(
        `验证记录已完结（结论：${record.conclusion}），不可再次结论`,
      );
    }

    if (!(VALID_CONCLUSIONS as readonly string[]).includes(dto.conclusion)) {
      throw new BadRequestException(
        `结论必须是 ${VALID_CONCLUSIONS.join(', ')} 之一`,
      );
    }

    const conclusion = dto.conclusion as ValidConclusion;

    if (conclusion === 'pass' && record.inspection_record_id) {
      await this.validateInspectionRecordBelongsToCompany(
        record.inspection_record_id,
        companyId,
      );
      await this.validateNoFailedItems(record.inspection_record_id);
    }

    if (conclusion === 'conditional') {
      if (!dto.approvalInstanceId) {
        throw new BadRequestException(
          '条件通过结论需要提供审批实例 ID (approvalInstanceId)',
        );
      }
      await this.validateApprovalInstanceExists(dto.approvalInstanceId);
    }

    return this.prisma.productValidationRecord.update({
      where: { id: recordId },
      data: {
        conclusion,
        conclusion_by: dto.conclusion_by ?? null,
        concluded_at: new Date(),
      },
    });
  }

  async listValidationRecords(
    companyId: string,
    productId: string,
    validationType?: string,
  ) {
    return this.prisma.productValidationRecord.findMany({
      where: {
        company_id: companyId,
        product_id: productId,
        ...(validationType ? { validation_type: validationType } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  }

  private async validateInspectionRecordBelongsToCompany(
    inspectionRecordId: string,
    companyId: string,
  ) {
    const inspectionRecord = await this.prisma.inspectionRecord.findUnique({
      where: { id: inspectionRecordId },
      select: { id: true, company_id: true },
    });

    if (!inspectionRecord) {
      throw new BadRequestException(
        `关联检验记录 ${inspectionRecordId} 不存在`,
      );
    }

    if (inspectionRecord.company_id !== companyId) {
      throw new BadRequestException(
        `关联检验记录 ${inspectionRecordId} 不属于当前企业`,
      );
    }
  }

  private async validateNoFailedItems(inspectionRecordId: string) {
    const failedItems = await this.prisma.inspectionRecordItem.findMany({
      where: { record_id: inspectionRecordId, judgment: 'fail' },
      select: { id: true },
    });

    if (failedItems.length > 0) {
      throw new BadRequestException(
        '关联检验记录存在不合格项，不能将结论设为通过',
      );
    }
  }

  private async validateApprovalInstanceExists(approvalInstanceId: string) {
    const instance = await this.prisma.approvalInstance.findUnique({
      where: { id: approvalInstanceId },
      select: { id: true },
    });

    if (!instance) {
      throw new BadRequestException(
        `审批实例 ${approvalInstanceId} 不存在`,
      );
    }
  }
}
