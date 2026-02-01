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

  private async generateTemplateNumber(level: number): Promise<string> {
    const prefix = `TPL${level}`;
    const count = await this.prisma.template.count({
      where: { level, deletedAt: null },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  async create(dto: CreateTemplateDto, userId: string) {
    const number = await this.generateTemplateNumber(dto.level);

    return this.prisma.template.create({
      data: {
        id: this.snowflake.nextId(),
        level: dto.level,
        number,
        title: dto.title,
        fieldsJson: dto.fields as unknown as any,
        creatorId: userId,
      },
    });
  }

  async createFromExcel(file: Express.Multer.File, level: number, userId: string) {
    const parseResult = this.excelParser.parseToTemplateFields(file.buffer);
    const number = await this.generateTemplateNumber(level);

    return this.prisma.template.create({
      data: {
        id: this.snowflake.nextId(),
        level,
        number,
        title: `${parseResult.fields[0]?.label || 'Excel模板'}`,
        fieldsJson: parseResult.fields as unknown as any,
        creatorId: userId,
      },
    });
  }

  async findAll(query: TemplateQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { keyword, level, status } = query;
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
      }) as unknown as any[],
      this.prisma.template.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id, deletedAt: null },
    }) as unknown as any;

    if (!template) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '模板不存在');
    }

    return template;
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.findOne(id);

    return this.prisma.template.update({
      where: { id },
      data: {
        title: dto.title,
        fieldsJson: dto.fields as unknown as any,
        status: dto.status,
        version: { increment: 0.1 },
      },
    });
  }

  async copy(id: string, userId: string) {
    const template = await this.findOne(id);
    const number = await this.generateTemplateNumber(template.level);

    return this.prisma.template.create({
      data: {
        id: this.snowflake.nextId(),
        level: template.level,
        number,
        title: `${template.title} - 副本`,
        fieldsJson: template.fieldsJson as unknown as any,
        creatorId: userId,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.template.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async toggleStatus(id: string) {
    const template = await this.findOne(id);

    return this.prisma.template.update({
      where: { id },
      data: { status: template.status === 'active' ? 'inactive' : 'active' },
    });
  }

  async parseExcel(file: Express.Multer.File) {
    return this.excelParser.parseToTemplateFields(file.buffer);
  }
}
