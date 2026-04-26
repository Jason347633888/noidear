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
    });
    return { ...form, landingEntry: entry };
  }

  async upsertTarget(code: string, dto: UpdateRecordFormLandingEntryDto) {
    const form = this.modelLanding.getFormByCode(code);
    if (!form) throw new NotFoundException(`Unknown source form: ${code}`);

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
