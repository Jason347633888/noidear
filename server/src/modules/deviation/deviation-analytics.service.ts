import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface TrendData {
  date: string;
  count: number;
  rate: number;
}

export interface FieldDistribution {
  fieldName: string;
  count: number;
  percentage: number;
}

export interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  totalTasks: number;
  deviationTasks: number;
  deviationRate: number;
}

export interface TemplateStats {
  templateId: string;
  templateTitle: string;
  totalTasks: number;
  deviationTasks: number;
  deviationRate: number;
}

export interface WordCloudData {
  text: string;
  value: number;
}

@Injectable()
export class DeviationAnalyticsService {
  private readonly logger = new Logger(DeviationAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDeviationTrend(
    startDate: Date,
    endDate: Date,
    granularity: 'day' | 'week' | 'month',
  ): Promise<TrendData[]> {
    let query: string;
    let dateField: string;

    if (granularity === 'day') {
      dateField = 'date';
      query = Prisma.sql`
        SELECT
          TO_CHAR(created_at, 'YYYY-MM-DD') as date,
          COUNT(*) as count
        FROM deviation_reports
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
          AND deleted_at IS NULL
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY date
      `.text;
    } else if (granularity === 'week') {
      dateField = 'week';
      query = Prisma.sql`
        SELECT
          TO_CHAR(created_at, 'IYYY-"W"IW') as week,
          COUNT(*) as count
        FROM deviation_reports
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
          AND deleted_at IS NULL
        GROUP BY TO_CHAR(created_at, 'IYYY-"W"IW')
        ORDER BY week
      `.text;
    } else {
      dateField = 'month';
      query = Prisma.sql`
        SELECT
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*) as count
        FROM deviation_reports
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
          AND deleted_at IS NULL
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month
      `.text;
    }

    const rawData: any[] = await this.prisma.$queryRawUnsafe(query);

    const totalTasks = await this.prisma.taskRecord.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
    });

    return rawData.map((row) => ({
      date: row[dateField],
      count: Number(row.count),
      rate: totalTasks > 0 ? (Number(row.count) / totalTasks) * 100 : 0,
    }));
  }

  async getFieldDistribution(
    startDate?: Date,
    endDate?: Date,
  ): Promise<FieldDistribution[]> {
    const where: any = { deletedAt: null };

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const groupedData = await this.prisma.deviationReport.groupBy({
      by: ['fieldName'],
      where,
      _count: {
        fieldName: true,
      },
      orderBy: {
        _count: {
          fieldName: 'desc',
        },
      },
    });

    const totalCount = await this.prisma.deviationReport.count({ where });

    return groupedData.map((item) => ({
      fieldName: item.fieldName,
      count: item._count.fieldName,
      percentage:
        totalCount > 0
          ? Number(((item._count.fieldName / totalCount) * 100).toFixed(2))
          : 0,
    }));
  }

  async getDeviationRateByDepartment(
    startDate?: Date,
    endDate?: Date,
  ): Promise<DepartmentStats[]> {
    let dateCondition = '';
    const params: any[] = [];

    if (startDate && endDate) {
      dateCondition = 'AND tr.created_at >= $1 AND tr.created_at <= $2';
      params.push(startDate, endDate);
    }

    const query = `
      SELECT
        d.id as department_id,
        d.name as department_name,
        COUNT(DISTINCT tr.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN tr.has_deviation THEN tr.id END) as deviation_tasks,
        (COUNT(DISTINCT CASE WHEN tr.has_deviation THEN tr.id END) * 100.0 / NULLIF(COUNT(DISTINCT tr.id), 0)) as deviation_rate
      FROM departments d
      LEFT JOIN tasks t ON t.department_id = d.id
      LEFT JOIN task_records tr ON tr.task_id = t.id AND tr.deleted_at IS NULL
      WHERE d.deleted_at IS NULL ${dateCondition}
      GROUP BY d.id, d.name
      HAVING COUNT(DISTINCT tr.id) > 0
      ORDER BY deviation_rate DESC
    `;

    const rawData: any[] = await this.prisma.$queryRawUnsafe(query, ...params);

    return rawData.map((row) => ({
      departmentId: row.department_id,
      departmentName: row.department_name,
      totalTasks: Number(row.total_tasks),
      deviationTasks: Number(row.deviation_tasks),
      deviationRate: Number(Number(row.deviation_rate).toFixed(2)),
    }));
  }

  async getDeviationRateByTemplate(
    startDate?: Date,
    endDate?: Date,
  ): Promise<TemplateStats[]> {
    let dateCondition = '';
    const params: any[] = [];

    if (startDate && endDate) {
      dateCondition = 'AND tr.created_at >= $1 AND tr.created_at <= $2';
      params.push(startDate, endDate);
    }

    const query = `
      SELECT
        tpl.id as template_id,
        tpl.title as template_title,
        COUNT(DISTINCT tr.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN tr.has_deviation THEN tr.id END) as deviation_tasks,
        (COUNT(DISTINCT CASE WHEN tr.has_deviation THEN tr.id END) * 100.0 / NULLIF(COUNT(DISTINCT tr.id), 0)) as deviation_rate
      FROM templates tpl
      LEFT JOIN task_records tr ON tr.template_id = tpl.id AND tr.deleted_at IS NULL
      WHERE tpl.deleted_at IS NULL ${dateCondition}
      GROUP BY tpl.id, tpl.title
      HAVING COUNT(DISTINCT tr.id) > 0
      ORDER BY deviation_rate DESC
    `;

    const rawData: any[] = await this.prisma.$queryRawUnsafe(query, ...params);

    return rawData.map((row) => ({
      templateId: row.template_id,
      templateTitle: row.template_title,
      totalTasks: Number(row.total_tasks),
      deviationTasks: Number(row.deviation_tasks),
      deviationRate: Number(Number(row.deviation_rate).toFixed(2)),
    }));
  }

  async getDeviationReasonWordCloud(): Promise<WordCloudData[]> {
    const reports = await this.prisma.deviationReport.findMany({
      where: { deletedAt: null },
      select: { reason: true },
    });

    if (reports.length === 0) {
      return [];
    }

    const wordCount = new Map<string, number>();

    for (const report of reports) {
      const words = this.extractKeywords(report.reason);
      for (const word of words) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    }

    const result = Array.from(wordCount.entries())
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50);

    return result;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      '的',
      '了',
      '是',
      '在',
      '我',
      '有',
      '和',
      '就',
      '不',
      '人',
      '都',
      '一',
      '一个',
      '上',
      '也',
      '很',
      '到',
      '说',
      '要',
      '去',
      '你',
      '会',
      '着',
      '没有',
      '看',
      '好',
      '自己',
      '这',
    ]);

    const words = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];

    return words.filter((word) => !stopWords.has(word));
  }
}
