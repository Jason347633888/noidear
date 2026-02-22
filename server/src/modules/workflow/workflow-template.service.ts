import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkflowTemplateDto } from './dto/create-workflow-template.dto';
import { UpdateWorkflowTemplateDto } from './dto/update-workflow-template.dto';
import { QueryWorkflowTemplateDto } from './dto/query-workflow-template.dto';

@Injectable()
export class WorkflowTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建工作流模板
   * 自动生成模板编码：{category}_{department}_{seq}
   */
  async create(createDto: CreateWorkflowTemplateDto) {
    try {
      // 生成模板编码
      const code = await this.generateTemplateCode(
        createDto.category,
        createDto.departmentId,
      );

      // 创建模板
      return await this.prisma.workflowTemplate.create({
        data: {
          code,
          name: createDto.name,
          category: createDto.category,
          departmentId: createDto.departmentId,
          steps: createDto.steps as any,
          description: createDto.description,
          version: 1,
          status: 'active',
        },
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * 查询工作流模板列表（分页）
   */
  async findAll(query: QueryWorkflowTemplateDto) {
    const { page = 1, limit = 10, category, departmentId, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (category) {
      where.category = category;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.workflowTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workflowTemplate.count({ where }),
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
   * 查询单个工作流模板
   */
  async findOne(id: string) {
    const template = await this.prisma.workflowTemplate.findUnique({
      where: { id },
    });

    if (!template || template.deletedAt) {
      throw new NotFoundException(`工作流模板 ${id} 不存在`);
    }

    return template;
  }

  /**
   * 更新工作流模板（递增版本号）
   */
  async update(id: string, updateDto: UpdateWorkflowTemplateDto) {
    // 检查模板是否存在
    const existingTemplate = await this.findOne(id);

    // 更新模板并递增版本号
    return await this.prisma.workflowTemplate.update({
      where: { id },
      data: {
        ...updateDto,
        steps: updateDto.steps as any,
        version: existingTemplate.version + 1,
      },
    });
  }

  /**
   * 停用工作流模板
   */
  async disable(id: string) {
    // 检查模板是否存在
    await this.findOne(id);

    // 停用模板
    return await this.prisma.workflowTemplate.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  /**
   * 生成模板编码
   * 格式：{category}_{department}_{seq}
   * 例如：document_production_001
   */
  private async generateTemplateCode(
    category: string,
    departmentId?: string,
  ): Promise<string> {
    const dept = departmentId || 'global';
    const prefix = `${category}_${dept}_`;

    // 查询该前缀下的最大序号
    const lastTemplate = await this.prisma.workflowTemplate.findFirst({
      where: {
        code: {
          startsWith: prefix,
        },
      },
      orderBy: { code: 'desc' },
    });

    let nextSeq = 1;
    if (lastTemplate) {
      // 从 code 中提取序号并递增
      const match = lastTemplate.code.match(/_(\d{3})$/);
      if (match) {
        nextSeq = parseInt(match[1]) + 1;
      }
    }

    // 生成新编码（序号补零到 3 位）
    const seq = nextSeq.toString().padStart(3, '0');
    return `${prefix}${seq}`;
  }
}
