import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecordTemplateDto } from './dto/create-record-template.dto';
import { UpdateRecordTemplateDto } from './dto/update-record-template.dto';
import { QueryRecordTemplateDto } from './dto/query-record-template.dto';

@Injectable()
export class RecordTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建记录模板
   * BR-211: 模板编号唯一性校验
   */
  async create(createDto: CreateRecordTemplateDto) {
    await this.validateUniqueCode(createDto.code);
    this.validateFieldsJson(createDto.fieldsJson);

    return await this.prisma.recordTemplate.create({
      data: {
        code: createDto.code,
        baseCode: createDto.code,
        templateFamilyId: createDto.code,
        name: createDto.name,
        fieldsJson: createDto.fieldsJson,
        retentionYears: createDto.retentionYears || 5,
        description: createDto.description,
        batchLinkEnabled: createDto.batchLinkEnabled,
        batchLinkType: createDto.batchLinkType,
        batchLinkField: createDto.batchLinkField,
        approvalRequired: createDto.approvalRequired ?? false,
        workflowConfig: createDto.workflowConfig,
      } as any,
    });
  }

  /**
   * 查询记录模板列表（分页）
   */
  async findAll(query: QueryRecordTemplateDto) {
    const { page = 1, limit = 10, status, keyword } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.recordTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.recordTemplate.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 查询单个模板详情
   */
  async findOne(id: string) {
    const template = await this.prisma.recordTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    return template;
  }

  /**
   * 更新记录模板
   */
  async update(id: string, updateDto: UpdateRecordTemplateDto) {
    await this.findOne(id);

    if (updateDto.fieldsJson) {
      this.validateFieldsJson(updateDto.fieldsJson);
    }

    return await this.prisma.recordTemplate.update({
      where: { id },
      data: {
        name: updateDto.name,
        fieldsJson: updateDto.fieldsJson,
        retentionYears: updateDto.retentionYears,
        description: updateDto.description,
        batchLinkEnabled: updateDto.batchLinkEnabled,
        batchLinkType: updateDto.batchLinkType,
        batchLinkField: updateDto.batchLinkField,
        approvalRequired: updateDto.approvalRequired,
        workflowConfig: updateDto.workflowConfig,
      },
    });
  }

  /**
   * 归档模板（BR-212）
   * 归档后不可新建记录，但历史记录仍可查询
   */
  async archive(id: string) {
    await this.findOne(id);

    return await this.prisma.recordTemplate.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  /**
   * P1-17: 创建新版本
   * 基于现有模板创建新版本（version +1），旧版本保持不变
   */
  async createNewVersion(id: string, updateDto: UpdateRecordTemplateDto) {
    const existing = await this.findOne(id);

    if (updateDto.fieldsJson) {
      this.validateFieldsJson(updateDto.fieldsJson);
    }

    if (existing.status !== 'active') {
      throw new BadRequestException('只有当前 active 版本才能通过此入口发起改版');
    }

    const baseCode = (existing as any).baseCode || existing.code.replace(/-v\d+$/, '');
    const templateFamilyId = (existing as any).templateFamilyId || baseCode;

    return this.prisma.$transaction(async (tx) => {
      // Compute next version from the family's current max to avoid conflicts
      // with any draft created via createRevision() in the same family.
      const latest = await tx.recordTemplate.findFirst({
        where: { templateFamilyId },
        orderBy: { version: 'desc' },
      });
      const nextVersion = (latest?.version ?? existing.version) + 1;

      await tx.recordTemplate.update({
        where: { id },
        data: { status: 'archived', versionStatus: 'retired', retiredAt: new Date() } as any,
      });

      return tx.recordTemplate.create({
        data: {
          code: baseCode,
          baseCode,
          templateFamilyId,
          supersedesId: id,
          name: updateDto.name || existing.name,
          fieldsJson: updateDto.fieldsJson || existing.fieldsJson,
          retentionYears: updateDto.retentionYears || existing.retentionYears,
          description: updateDto.description || existing.description,
          approvalRequired: updateDto.approvalRequired ?? (existing as any).approvalRequired ?? false,
          workflowConfig: updateDto.workflowConfig ?? (existing as any).workflowConfig,
          version: nextVersion,
          status: 'active',
          versionStatus: 'active',
          effectiveAt: new Date(),
        } as any,
      });
    });
  }

  /**
   * 更新草稿模板字段（已启用模板禁止原地修改）
   */
  async updateFields(id: string, fields: Array<Record<string, unknown>>) {
    const template = await this.findOne(id);
    if (template.status === 'active' || (template as any).versionStatus === 'active') {
      throw new BadRequestException('已启用模板不能原地修改字段，请发起模板改版');
    }
    const fieldsJson = { fields };
    this.validateFieldsJson(fieldsJson);
    return this.prisma.recordTemplate.update({
      where: { id },
      data: { fieldsJson: fieldsJson as any },
    });
  }

  /**
   * 发起模板改版草稿（版本 +1，code 保持不变，不追加 -vN 后缀）
   */
  async createRevision(id: string, updateDto: UpdateRecordTemplateDto) {
    const existing = await this.findOne(id);
    if (updateDto.fieldsJson) {
      this.validateFieldsJson(updateDto.fieldsJson);
    }

    const baseCode = (existing as any).baseCode || existing.code.replace(/-v\d+$/, '');
    const templateFamilyId = (existing as any).templateFamilyId || baseCode;
    const latest = await this.prisma.recordTemplate.findFirst({
      where: { templateFamilyId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version ?? existing.version) + 1;

    return this.prisma.recordTemplate.create({
      data: {
        code: baseCode,
        baseCode,
        templateFamilyId,
        name: updateDto.name || existing.name,
        fieldsJson: updateDto.fieldsJson || existing.fieldsJson,
        retentionYears: updateDto.retentionYears || existing.retentionYears,
        description: updateDto.description || existing.description,
        approvalRequired: updateDto.approvalRequired ?? (existing as any).approvalRequired ?? false,
        workflowConfig: updateDto.workflowConfig ?? (existing as any).workflowConfig,
        version: nextVersion,
        versionStatus: 'draft',
        status: 'draft',
        supersedesId: existing.id,
      } as any,
    });
  }

  /**
   * 启用模板版本（将同族旧版本退役）
   */
  async activateRevision(id: string, userId: string) {
    const template = await this.findOne(id);
    if ((template as any).versionStatus !== 'draft') {
      throw new BadRequestException('只有草稿模板版本可以启用');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.recordTemplate.updateMany({
        where: {
          templateFamilyId: (template as any).templateFamilyId || (template as any).baseCode || template.code,
          id: { not: id },
          status: 'active',
        },
        data: { status: 'retired', versionStatus: 'retired', retiredAt: new Date() } as any,
      });
      return tx.recordTemplate.update({
        where: { id },
        data: {
          status: 'active',
          versionStatus: 'active',
          effectiveAt: new Date(),
          approvedAt: new Date(),
          approvedBy: userId,
        } as any,
      });
    });
  }

  /**
   * P1-17: 查询模板版本历史
   */
  async getVersionHistory(code: string) {
    // 查找所有以该 code 开头的模板（包含 code 和 code-vN）
    const baseCode = code.replace(/-v\d+$/, '');

    const versions = await this.prisma.recordTemplate.findMany({
      where: {
        OR: [
          { code: baseCode },
          { code: { startsWith: `${baseCode}-v` } },
        ],
      },
      orderBy: { version: 'desc' },
    });

    return {
      code: baseCode,
      versions,
      latestVersion: versions.length > 0 ? versions[0].version : 0,
    };
  }

  /**
   * 验证模板编号唯一性（BR-211）
   */
  private async validateUniqueCode(code: string) {
    const existing = await this.prisma.recordTemplate.findFirst({
      where: { code },
    });

    if (existing) {
      throw new ConflictException(`模板编号 ${code} 已存在`);
    }
  }

  /**
   * 验证 fieldsJson 结构
   */
  private validateFieldsJson(fieldsJson: any) {
    if (!fieldsJson || typeof fieldsJson !== 'object') {
      throw new BadRequestException('fieldsJson 必须是有效的 JSON 对象');
    }

    if (!fieldsJson.fields || !Array.isArray(fieldsJson.fields)) {
      throw new BadRequestException('fieldsJson 必须包含 fields 数组');
    }
  }
}
