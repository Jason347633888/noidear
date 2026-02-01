import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExcelParserService } from '../../common/services';
import { Snowflake } from '../../common/utils/snowflake';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { CreateTemplateDto, UpdateTemplateDto, TemplateQueryDto } from './dto';

@Injectable()
export class TemplateService {
  private readonly snowflake: Snowflake;

  constructor(
    private readonly prisma: PrismaService,
    private readonly excelParser: ExcelParserService,
  ) {
    this.snowflake = new Snowflake(1, 1);
  }

  /**
   * 生成模板编号
   */
  private async generateTemplateNumber(level: number): Promise<string {
    const prefix = `TPL${level}`;
    const count = await this.prisma.template.count({
      where: { level, deletedAt: null },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * 创建模板
   */
  async create(dto: CreateTemplateDto, userId: string) {
    const number = await this.generateTemplateNumber(dto.level);

    return this.prisma.template.create({
      data: {
        id: this.snowflake.nextId(),
        level: dto.level,
        number,
        title: dto.title,
        fieldsJson: dto.fields,
        creatorId: userId,
      },
    });
  }

  /**
   * 解析 Excel 创建模板
   */
  async createFromExcel(file: Express.Multer.File, level: number, userId: string) {
    const parseResult = this.excelParser.parseToTemplateFields(file.buffer);

    const number = await this.generateTemplateNumber(level);

    return this.prisma.template.create({
      data: {
        id: this.snowflake.nextId(),
        level,
        number,
        title: `${parseResult.fields[0]?.label || 'Excel模板'}`,
        fieldsJson: parseResult.fields,
        creatorId: userId,
      },
    });
  }

  /**
   * 查询模板列表
   */
  async findAll(query: TemplateQueryDto) {
    const { page, limit, keyword, level, status } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { number: { contains: keyword } },
      ];
    }

    if (level) {
      where.level = level;
    }

    if (status) {
      where.status = status;
    }

    const [list, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, name: true } },
        },
      }),
      this.prisma.template.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  /**
   * 查询单个模板
   */
  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id, deletedAt: null },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    if (!template) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '模板不存在');
    }

    return template;
  }

  /**
   * 更新模板
   */
  async update(id: string, dto: UpdateTemplateDto) {
    await this.findOne(id);

    return this.prisma.template.update({
      where: { id },
      data: {
        title: dto.title,
        fieldsJson: dto.fields,
        status: dto.status,
        version: { increment: 0.1 },
      },
    });
  }

  /**
   * 复制模板
   */
  async copy(id: string, userId: string) {
    const template = await this.findOne(id);

    const number = await this.generateTemplateNumber(template.level);

    return this.prisma.template.create({
      data: {
        id: this.snowflake.nextId(),
        level: template.level,
        number,
        title: `${template.title} - 副本`,
        fieldsJson: template.fieldsJson,
        creatorId: userId,
      },
    });
  }

  /**
   * 删除模板（软删除）
   */
  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.template.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  /**
   * 切换模板状态
   */
  async toggleStatus(id: string) {
    const template = await this.findOne(id);

    return this.prisma.template.update({
      where: { id },
      data: { status: template.status === 'active' ? 'inactive' : 'active' },
    });
  }

  /**
   * 解析模板 Excel
   */
  async parseExcel(file: Express.Multer.File) {
    return this.excelParser.parseToTemplateFields(file.buffer);
  }
}
