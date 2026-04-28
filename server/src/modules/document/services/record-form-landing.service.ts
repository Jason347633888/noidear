import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ModelLandingService } from '../../model-landing/model-landing.service';
import { ConfirmRecordFormLandingDto, UpdateRecordFormLandingEntryDto } from '../dto/document-control.dto';

@Injectable()
export class RecordFormLandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelLanding: ModelLandingService,
  ) {}

  async list(query: { keyword?: string; department?: string; templateGroupId?: string }) {
    const groups = this.modelLanding.listGroups();
    const forms = groups.flatMap((group) =>
      this.modelLanding.getGroup(group.id).forms.map((form) => ({
        ...form,
        groupId: group.id,
      })),
    );

    const filtered = forms.filter((form) => {
      if (query.keyword && !`${form.code} ${form.formName}`.includes(query.keyword)) return false;
      if (query.department && form.department !== query.department) return false;
      if (query.templateGroupId && form.templateGroupId !== query.templateGroupId) return false;
      return true;
    });

    const overrides = await this.prisma.recordFormLandingEntry.findMany({
      where: { sourceCode: { in: filtered.map((form) => form.code) } },
      include: {
        targetTemplate: { select: { id: true, code: true, name: true, status: true } },
      },
    });
    const overrideMap = new Map(overrides.map((entry) => [entry.sourceCode, entry]));

    return filtered.map((form) => ({
      ...form,
      landingEntry: overrideMap.get(form.code) ?? null,
    }));
  }

  async get(code: string) {
    const form = this.modelLanding.getFormByCode(code);
    const entry = await this.prisma.recordFormLandingEntry.findUnique({
      where: { sourceCode: code },
      include: {
        targetTemplate: { select: { id: true, code: true, name: true, status: true } },
      },
    });
    return { ...form, landingEntry: entry };
  }

  async upsertTarget(code: string, dto: UpdateRecordFormLandingEntryDto) {
    const form = this.modelLanding.getFormByCode(code);
    if (!form) throw new NotFoundException(`Unknown source form: ${code}`);
    const targetTemplateId = dto.targetTemplateId?.trim() || null;

    if (targetTemplateId) {
      const template = await this.prisma.recordTemplate.findFirst({
        where: { id: targetTemplateId, deletedAt: null },
      });
      if (!template) throw new NotFoundException(`记录模板不存在: ${targetTemplateId}`);
    }

    if (dto.relatedDocIds?.length) {
      const count = await this.prisma.document.count({
        where: { id: { in: dto.relatedDocIds }, deletedAt: null },
      });
      if (count !== dto.relatedDocIds.length) {
        throw new NotFoundException('相关文件不存在或已删除');
      }
    }

    return this.prisma.recordFormLandingEntry.upsert({
      where: { sourceCode: code },
      update: {
        targetModule: dto.targetModule,
        targetModel: dto.targetModel,
        targetRoute: dto.targetRoute,
        targetTemplateId,
        landingStrategy: dto.landingStrategy,
        relatedDocIds: dto.relatedDocIds ?? [],
        notes: dto.notes,
      },
      create: {
        sourceCode: code,
        targetModule: dto.targetModule,
        targetModel: dto.targetModel,
        targetRoute: dto.targetRoute,
        targetTemplateId,
        landingStrategy: dto.landingStrategy,
        relatedDocIds: dto.relatedDocIds ?? [],
        notes: dto.notes,
      },
    });
  }

  async suggest(code: string) {
    const form = this.modelLanding.getFormByCode(code);
    if (!form) throw new NotFoundException(`Unknown source form: ${code}`);
    const existing = await this.prisma.recordFormLandingEntry.findUnique({ where: { sourceCode: code } });
    if (existing?.confirmationStatus === 'confirmed') return existing;

    const targetRoute = (form as any).targetRoute || this.inferRoute(form as any);
    const landingStatus = targetRoute ? 'business_module' : 'unimplemented';
    return {
      sourceCode: code,
      landingStatus,
      confirmationStatus: 'suggested',
      confidence: targetRoute ? 'high' : 'low',
      targetModule: (form as any).primaryEntity || null,
      targetModel: (form as any).primaryEntity || null,
      targetRoute,
      fieldCoverageStatus: targetRoute ? 'partial' : 'unknown',
      reason: targetRoute ? 'model-landing 已存在候选业务入口' : '未识别到业务入口或动态模板',
    };
  }

  async confirm(code: string, dto: ConfirmRecordFormLandingDto, userId: string) {
    const form = this.modelLanding.getFormByCode(code);
    if (!form) throw new NotFoundException(`Unknown source form: ${code}`);
    return this.upsertGovernance(code, dto, userId);
  }

  async getFieldCoverage(code: string) {
    const form = this.modelLanding.getFormByCode(code);
    if (!form) throw new NotFoundException(`Unknown source form: ${code}`);
    const entry = await this.prisma.recordFormLandingEntry.findUnique({
      where: { sourceCode: code },
      include: { targetTemplate: true },
    });

    const sourceFields = ((form as any).fields ?? []).map((field: any) => String(field.name || field.label));
    const templateFields = ((entry?.targetTemplate?.fieldsJson as any)?.fields ?? []).map((field: any) => String(field.name || field.label));
    const covered = sourceFields.filter((field: string) => templateFields.includes(field));
    const missing = sourceFields.filter((field: string) => !templateFields.includes(field));

    return {
      sourceCode: code,
      status: missing.length === 0 && sourceFields.length > 0 ? 'covered' : covered.length > 0 ? 'partial' : 'unknown',
      sourceFields,
      coveredFields: covered,
      missingFields: missing,
    };
  }

  private inferRoute(form: Record<string, any>) {
    const entity = String(form.primaryEntity || form.targetModel || '');
    const routeMap: Record<string, string> = {
      ProductDevelopment: '/process/instances',
      Supplier: '/suppliers',
      IncomingInspection: '/quality/incoming-inspection',
      ProductionBatch: '/production/batches',
    };
    return routeMap[entity] ?? null;
  }

  private async upsertGovernance(code: string, dto: ConfirmRecordFormLandingDto, userId: string) {
    const now = new Date();
    return this.prisma.recordFormLandingEntry.upsert({
      where: { sourceCode: code },
      create: {
        sourceCode: code,
        landingStatus: dto.landingStatus,
        landingStrategy: dto.landingStrategy,
        confirmationStatus: dto.confirmationStatus ?? 'confirmed',
        confirmedBy: userId,
        confirmedAt: now,
        confidence: dto.confidence,
        targetModule: dto.targetModule,
        targetModel: dto.targetModel,
        targetRoute: dto.targetRoute,
        targetTemplateId: dto.targetTemplateId,
        fieldCoverageStatus: dto.fieldCoverageStatus ?? 'unknown',
        fieldCoverageSummary: dto.fieldCoverageSummary as any,
        primaryRoute: dto.primaryRoute ?? dto.targetRoute,
      },
      update: {
        landingStatus: dto.landingStatus,
        landingStrategy: dto.landingStrategy,
        confirmationStatus: dto.confirmationStatus ?? 'confirmed',
        confirmedBy: userId,
        confirmedAt: now,
        confidence: dto.confidence,
        targetModule: dto.targetModule,
        targetModel: dto.targetModel,
        targetRoute: dto.targetRoute,
        targetTemplateId: dto.targetTemplateId,
        fieldCoverageStatus: dto.fieldCoverageStatus ?? 'unknown',
        fieldCoverageSummary: dto.fieldCoverageSummary as any,
        primaryRoute: dto.primaryRoute ?? dto.targetRoute,
      },
    });
  }
}
