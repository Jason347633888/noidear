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
        name: createDto.name,
        fieldsJson: createDto.fieldsJson,
        retentionYears: createDto.retentionYears || 3,
        description: createDto.description,
      },
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
      data: updateDto,
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

    // 归档当前版本
    await this.prisma.recordTemplate.update({
      where: { id },
      data: { status: 'archived' },
    });

    // 创建新版本
    const newVersion = existing.version + 1;
    return await this.prisma.recordTemplate.create({
      data: {
        code: existing.code + `-v${newVersion}`,
        name: updateDto.name || existing.name,
        fieldsJson: updateDto.fieldsJson || existing.fieldsJson,
        retentionYears: updateDto.retentionYears || existing.retentionYears,
        description: updateDto.description || existing.description,
        version: newVersion,
        status: 'active',
      },
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
    const existing = await this.prisma.recordTemplate.findUnique({
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
