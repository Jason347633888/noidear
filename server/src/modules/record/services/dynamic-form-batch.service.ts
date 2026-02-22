import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface BatchSubmissionsQuery {
  page?: number;
  limit?: number;
  status?: string;
}

@Injectable()
export class DynamicFormBatchService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubmissionsByBatch(
    formId: string,
    batchId: string,
    query: BatchSubmissionsQuery = {},
  ) {
    await this.validateTemplate(formId);

    const { page = 1, limit = 10 } = query;
    const where = this.buildWhereClause(formId, batchId, query.status);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.findRecords(where, skip, limit),
      this.prisma.record.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  private async validateTemplate(formId: string): Promise<void> {
    const template = await this.prisma.recordTemplate.findUnique({
      where: { id: formId },
    });

    if (!template) {
      throw new NotFoundException('表单模板不存在');
    }
  }

  private buildWhereClause(formId: string, batchId: string, status?: string) {
    const where: any = {
      templateId: formId,
      deletedAt: null,
      dataJson: {
        path: ['batchId'],
        equals: batchId,
      },
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    return where;
  }

  private async findRecords(where: any, skip: number, take: number) {
    return this.prisma.record.findMany({
      where,
      skip,
      take,
      include: {
        template: true,
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
