import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ModelLandingService } from '../../model-landing/model-landing.service';
import { UpdateRecordFormLandingEntryDto } from '../dto/document-control.dto';

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

    if (dto.targetTemplateId) {
      const template = await this.prisma.recordTemplate.findFirst({
        where: { id: dto.targetTemplateId, deletedAt: null },
      });
      if (!template) throw new NotFoundException(`记录模板不存在: ${dto.targetTemplateId}`);
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
        targetTemplateId: dto.targetTemplateId,
        landingStrategy: dto.landingStrategy,
        relatedDocIds: dto.relatedDocIds ?? [],
        notes: dto.notes,
      },
      create: {
        sourceCode: code,
        targetModule: dto.targetModule,
        targetModel: dto.targetModel,
        targetRoute: dto.targetRoute,
        targetTemplateId: dto.targetTemplateId,
        landingStrategy: dto.landingStrategy,
        relatedDocIds: dto.relatedDocIds ?? [],
        notes: dto.notes,
      },
    });
  }
}
