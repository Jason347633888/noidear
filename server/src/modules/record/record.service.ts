import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowInstanceService } from '../workflow/workflow-instance.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { QueryRecordDto } from './dto/query-record.dto';
import { QueryChangeLogDto } from './dto/query-change-log.dto';

@Injectable()
export class RecordService {
  private readonly logger = new Logger(RecordService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowInstanceService: WorkflowInstanceService,
  ) {}

  /**
   * 创建记录实例
   * BR-221: 自动生成记录编号
   * TASK-169: 自动关联批次
   * HIGH-5: 若模板配置 approvalRequired + workflowConfig，自动启动工作流实例
   */
  async create(createDto: CreateRecordDto, userId: string) {
    const template = await this.prisma.recordTemplate.findUnique({
      where: { id: createDto.templateId },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    this.validateDataJson(createDto.dataJson, template.fieldsJson);

    const number = await this.generateRecordNumber();
    const retentionUntil = this.calculateRetentionUntil(template.retentionYears);

    // TASK-169: 批次关联逻辑
    let batchAssociation: any = {};
    if (template.batchLinkEnabled && template.batchLinkField && template.batchLinkType) {
      const dataJson = createDto.dataJson as Record<string, any>;
      const batchNumber = dataJson[template.batchLinkField];
      if (batchNumber) {
        batchAssociation = await this.associateBatch(
          batchNumber,
          template.batchLinkType,
        );
      }
    }

    const record = await this.prisma.record.create({
      data: {
        templateId: createDto.templateId,
        number,
        dataJson: createDto.dataJson,
        createdBy: userId,
        retentionUntil,
        offlineFilled: createDto.offlineFilled ?? false,
        ...batchAssociation,
      },
    });

    // HIGH-5: 若模板需要审批且配置了工作流，自动启动工作流实例
    const templateAny = template as any;
    if (templateAny.approvalRequired && templateAny.workflowConfig?.templateId) {
      try {
        const instance = await this.workflowInstanceService.create(
          {
            templateId: templateAny.workflowConfig.templateId,
            resourceType: 'record',
            resourceId: record.id,
            resourceTitle: `记录 ${record.number}`,
          },
          userId,
        );

        const workflowId: string | null = instance?.data?.id ?? null;
        await this.prisma.record.update({
          where: { id: record.id },
          data: { workflowId },
        });

        return { ...record, workflowId };
      } catch (error) {
        this.logger.error(`自动启动工作流失败，记录 ${record.id}: ${error.message}`);
        // 工作流启动失败不影响记录创建，返回已创建的记录
      }
    }

    return record;
  }

  /**
   * 查询记录列表（分页）
   */
  async findAll(query: QueryRecordDto) {
    const { page = 1, limit = 10, status, templateId, keyword } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (templateId) {
      where.templateId = templateId;
    }

    if (keyword) {
      where.number = { contains: keyword };
    }

    const [data, total] = await Promise.all([
      this.prisma.record.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.record.count({ where }),
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
   * 查询单个记录详情
   */
  async findOne(id: string) {
    const record = await this.prisma.record.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('记录不存在');
    }

    return record;
  }

  /**
   * 更新记录
   */
  async update(id: string, updateDto: UpdateRecordDto, userId: string) {
    const existing = await this.prisma.record.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) {
      throw new NotFoundException('记录不存在');
    }
    if (existing.status === 'approved') {
      throw new ForbiddenException('已审批通过的记录不允许修改');
    }

    const record = await this.findOne(id);

    if (updateDto.dataJson) {
      const template = await this.prisma.recordTemplate.findUnique({
        where: { id: record.templateId },
      });

      if (!template) {
        throw new NotFoundException('模板不存在');
      }

      this.validateDataJson(updateDto.dataJson, template.fieldsJson);
    }

    const updateData: any = {};
    if (updateDto.dataJson !== undefined) updateData.dataJson = updateDto.dataJson;
    if (updateDto.offlineFilled !== undefined) updateData.offlineFilled = updateDto.offlineFilled;
    if (updateDto.signatureTimestamp !== undefined) {
      updateData.signatureTimestamp = new Date(updateDto.signatureTimestamp);
    }

    return await this.prisma.record.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * 删除记录（软删除）
   */
  async remove(id: string) {
    await this.findOne(id);

    return await this.prisma.record.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * 查询记录变更历史
   * BR-251: 变更历史记录（BRCGS合规）
   */
  async getChangeLogs(recordId: string, query: QueryChangeLogDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.recordChangeLog.findMany({
        where: { recordId },
        skip,
        take: limit,
        orderBy: { changedAt: 'desc' },
      }),
      this.prisma.recordChangeLog.count({ where: { recordId } }),
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
   * P0-3: 提交记录审批
   * BR-221: 记录提交规则
   */
  async submit(id: string, userId: string) {
    const record = await this.findOne(id);

    if (record.status !== 'draft') {
      throw new BadRequestException(`记录状态为 ${record.status}，仅草稿状态可提交`);
    }

    return await this.prisma.record.update({
      where: { id },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
      },
    });
  }

  /**
   * P0-5: 电子签名（BRCGS 合规）
   * 提交记录时附带电子签名（用户名+密码再验证）
   */
  async signRecord(id: string, userId: string, signatureData: { password: string; comment?: string }) {
    const record = await this.findOne(id);

    if (record.status !== 'submitted' && record.status !== 'draft') {
      throw new BadRequestException(`记录状态为 ${record.status}，无法签名`);
    }

    // 验证用户密码（电子签名需要再次验证身份）
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // BRCGS 合规：电子签名必须通过密码再验证身份
    const isPasswordValid = await bcrypt.compare(signatureData.password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('电子签名密码验证失败');
    }

    const now = new Date();
    return await this.prisma.record.update({
      where: { id },
      data: {
        status: 'signed',
        approvedAt: now,
        signatureTimestamp: now,
        dataJson: {
          ...(record.dataJson as object),
          _signature: {
            signedBy: userId,
            signedAt: now.toISOString(),
            comment: signatureData.comment || '',
          },
        },
      },
    });
  }

  /**
   * P1-16: 修改已审批记录（含变更原因，BRCGS 合规）
   */
  async updateApproved(id: string, updateDto: UpdateRecordDto, userId: string, reason: string) {
    const record = await this.findOne(id);

    if (record.status !== 'signed' && record.status !== 'submitted') {
      throw new BadRequestException('仅已签名/已提交记录可修改（需记录变更原因）');
    }

    const template = await this.prisma.recordTemplate.findUnique({
      where: { id: record.templateId },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    if (updateDto.dataJson) {
      this.validateDataJson(updateDto.dataJson, template.fieldsJson);
    }

    // 记录变更历史（BRCGS 合规）
    await this.prisma.recordChangeLog.create({
      data: {
        recordId: id,
        oldData: record.dataJson as object,
        newData: (updateDto.dataJson || record.dataJson) as object,
        changedBy: userId,
        reason,
      },
    });

    return await this.prisma.record.update({
      where: { id },
      data: {
        dataJson: updateDto.dataJson || undefined,
      },
    });
  }

  /**
   * P1-16: 查询记录保留期限
   */
  async getRetentionInfo(id: string) {
    const record = await this.prisma.record.findUnique({
      where: { id },
      include: { template: { select: { retentionYears: true } } },
    });

    if (!record) {
      throw new NotFoundException('记录不存在');
    }

    return {
      id: record.id,
      number: record.number,
      retentionUntil: record.retentionUntil,
      retentionYears: record.template.retentionYears,
      isExpired: record.retentionUntil ? new Date() > record.retentionUntil : false,
    };
  }

  /**
   * 验证 dataJson 结构
   */
  private validateDataJson(dataJson: any, formSchema: any) {
    if (!formSchema || typeof formSchema !== 'object') {
      throw new BadRequestException('Invalid template formSchema');
    }

    if (!formSchema.fields || !Array.isArray(formSchema.fields)) {
      throw new BadRequestException('fieldsJson 必须包含 fields 数组');
    }

    for (const field of formSchema.fields) {
      if (field.required && !dataJson[field.name]) {
        throw new BadRequestException(`Required field ${field.name} is missing`);
      }
    }
  }

  /**
   * 生成记录编号（BR-221）
   * 格式：REC-YYYYMMDD-NNNN
   */
  private async generateRecordNumber(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `REC-${today}-`;

    const lastRecord = await this.prisma.record.findFirst({
      where: { number: { startsWith: prefix } },
      orderBy: { createdAt: 'desc' },
    });

    const sequence = lastRecord
      ? parseInt(lastRecord.number.split('-')[2]) + 1
      : 1;

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  /**
   * 计算保留截止日期
   */
  private calculateRetentionUntil(retentionYears: number): Date {
    const date = new Date();
    date.setFullYear(date.getFullYear() + retentionYears);
    return date;
  }

  /**
   * TASK-169: 关联批次
   * 根据批次号和类型自动关联到对应的批次
   */
  private async associateBatch(
    batchNumber: string,
    batchType: string,
  ): Promise<any> {
    if (batchType === 'production') {
      const batch = await this.prisma.productionBatch.findUnique({
        where: { batchNumber },
      });

      if (batch) {
        return {
          relatedBatchType: 'production',
          relatedBatchId: batch.id,
          relatedBatchNumber: batch.batchNumber,
          productionBatchId: batch.id,
        };
      }
    } else if (batchType === 'finished_goods') {
      const batch = await this.prisma.finishedGoodsBatch.findUnique({
        where: { batchNumber },
      });

      if (batch) {
        return {
          relatedBatchType: 'finished_goods',
          relatedBatchId: batch.id,
          relatedBatchNumber: batch.batchNumber,
          finishedGoodsBatchId: batch.id,
        };
      }
    }

    return {};
  }
}
