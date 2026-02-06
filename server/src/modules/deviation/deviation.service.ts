import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';

export interface DeviationDetectionResult {
  fieldName: string;
  expectedValue: string;
  actualValue: string;
  toleranceMin: number;
  toleranceMax: number;
  deviationAmount: number;
  deviationRate: number;
  deviationType: 'range' | 'percentage';
}

export interface DeviationReportQueryDto {
  page?: number;
  limit?: number;
  templateId?: string;
  recordId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class DeviationService {
  private readonly logger = new Logger(DeviationService.name);

  constructor(private readonly prisma: PrismaService) {}

  detectDeviations(
    templateFields: any[],
    actualData: Record<string, any>,
  ): DeviationDetectionResult[] {
    const deviations: DeviationDetectionResult[] = [];

    for (const field of templateFields) {
      if (field.type !== 'number' || !field.tolerance) {
        continue;
      }

      const actualValue = actualData[field.name];
      if (actualValue === undefined || actualValue === null) {
        continue;
      }

      const numericValue = Number(actualValue);
      const { tolerance } = field;
      const { min, max, type } = tolerance;

      const expectedValue = (min + max) / 2;
      let isDeviation = false;
      let deviationAmount = 0;
      let deviationRate = 0;

      if (type === 'range') {
        isDeviation = numericValue < min || numericValue > max;
        deviationAmount = Math.max(
          Math.abs(numericValue - min),
          Math.abs(numericValue - max),
        );
        if (numericValue >= min && numericValue <= max) {
          deviationAmount = 0;
        } else if (numericValue < min) {
          deviationAmount = min - numericValue;
        } else {
          deviationAmount = numericValue - max;
        }
      } else if (type === 'percentage') {
        deviationRate = this.calculateDeviationRate(expectedValue, numericValue);
        isDeviation = Math.abs(deviationRate) > (tolerance.percentage || 0);
        deviationAmount = Math.abs(numericValue - expectedValue);
      }

      if (isDeviation) {
        deviations.push({
          fieldName: field.name,
          expectedValue: String(expectedValue),
          actualValue: String(numericValue),
          toleranceMin: min,
          toleranceMax: max,
          deviationAmount,
          deviationRate,
          deviationType: type,
        });
      }
    }

    return deviations;
  }

  calculateDeviationRate(expectedValue: number, actualValue: number): number {
    if (expectedValue === 0) {
      return 0;
    }
    return ((actualValue - expectedValue) / expectedValue) * 100;
  }

  async createDeviationReports(
    recordId: string,
    templateId: string,
    deviations: DeviationDetectionResult[],
    reasons: Record<string, string>,
    userId: string,
  ) {
    const reports = [];

    for (const deviation of deviations) {
      const reason = reasons[deviation.fieldName];

      if (!reason) {
        throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          `字段 [${deviation.fieldName}] 偏离，必须填写偏离原因`,
        );
      }

      if (reason.length < 10) {
        throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          `偏离原因至少需要10个字符，当前${reason.length}个字符`,
        );
      }

      if (reason.length > 500) {
        throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          `偏离原因最多500个字符，当前${reason.length}个字符`,
        );
      }

      const report = await this.prisma.deviationReport.create({
        data: {
          id: crypto.randomUUID(),
          recordId,
          templateId,
          fieldName: deviation.fieldName,
          expectedValue: deviation.expectedValue,
          actualValue: deviation.actualValue,
          toleranceMin: deviation.toleranceMin,
          toleranceMax: deviation.toleranceMax,
          deviationAmount: deviation.deviationAmount,
          deviationRate: deviation.deviationRate,
          deviationType: deviation.deviationType,
          reason,
          reportedBy: userId,
          reportedAt: new Date(),
        },
      });

      reports.push(report);
    }

    await this.prisma.taskRecord.update({
      where: { id: recordId },
      data: {
        hasDeviation: true,
        deviationCount: deviations.length,
      },
    });

    return reports;
  }

  async findDeviationReports(query: DeviationReportQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    if (query.templateId) {
      where.templateId = query.templateId;
    }

    if (query.recordId) {
      where.recordId = query.recordId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      const dateFilter: any = {};
      if (query.startDate) {
        dateFilter.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        dateFilter.lte = new Date(query.endDate);
      }
      where.createdAt = dateFilter;
    }

    const [list, total] = await Promise.all([
      this.prisma.deviationReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deviationReport.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  async approveDeviationReport(
    reportId: string,
    approverId: string,
    status: 'approved' | 'rejected',
    comment?: string,
  ) {
    const report = await this.prisma.deviationReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '偏离报告不存在');
    }

    if (report.status !== 'pending') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        `偏离报告已审批，当前状态：${report.status}`,
      );
    }

    return this.prisma.deviationReport.update({
      where: { id: reportId },
      data: {
        status,
        approvedBy: approverId,
        approvedAt: new Date(),
        comment,
      },
    });
  }
}
