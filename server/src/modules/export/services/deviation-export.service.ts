import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExportDeviationReportsDto } from '../dto';
import { formatDate, formatStatus } from '../../../shared/utils/format.util';
import {
  FieldConfig,
  setupWorksheet,
  getFilteredFields,
  filterRow,
  addDateRange,
} from '../../../shared/utils/excel.util';

const COMMON_STATUS_MAP: Record<string, string> = {
  draft: '草稿',
  pending: '待处理',
  pending_review: '待审核',
  pending_approval: '待审批',
  approved: '已批准',
  rejected: '已拒绝',
  completed: '已完成',
  cancelled: '已取消',
  active: '启用',
  inactive: '禁用',
};

const DEVIATION_FIELDS: FieldConfig[] = [
  { key: 'fieldName', label: '字段名称', width: 20 },
  { key: 'expectedValue', label: '期望值', width: 15 },
  { key: 'actualValue', label: '实际值', width: 15 },
  { key: 'deviationAmount', label: '偏离量', width: 15 },
  { key: 'deviationRate', label: '偏离率', width: 15 },
  { key: 'deviationType', label: '偏离类型', width: 15 },
  { key: 'reason', label: '原因', width: 30 },
  { key: 'status', label: '状态', width: 15 },
  { key: 'reportedAt', label: '上报时间', width: 20 },
];

@Injectable()
export class DeviationExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportDeviationReports(dto: ExportDeviationReportsDto, user?: any): Promise<Buffer> {
    const where = this.buildDeviationWhere(dto);

    if (user) {
      if (user.roleCode === 'user') {
        where.creatorId = user.id;
      } else if (user.roleCode === 'leader') {
        where.creator = { departmentId: user.departmentId };
      }
    }

    const fields = getFilteredFields(DEVIATION_FIELDS, dto.fields);
    const total = await this.prisma.deviationReport.count({ where });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('偏离报告');
    setupWorksheet(worksheet, fields);

    await this.fillDeviations(worksheet, where, total, fields);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  public async fillDeviations(
    worksheet: ExcelJS.Worksheet,
    where: any,
    total: number,
    fields: FieldConfig[],
  ) {
    const pageSize = 1000;
    let page = 0;

    while (page * pageSize < total) {
      const reports = await this.prisma.deviationReport.findMany({
        where,
        skip: page * pageSize,
        take: pageSize,
        orderBy: { reportedAt: 'desc' },
      });

      reports.forEach((report: any) => {
        const row = this.mapDeviationRow(report);
        worksheet.addRow(filterRow(row, fields));
      });
      page++;
    }
  }

  public mapDeviationRow(report: any): Record<string, unknown> {
    return {
      fieldName: report.fieldName,
      expectedValue: report.expectedValue,
      actualValue: report.actualValue,
      deviationAmount: report.deviationAmount,
      deviationRate: `${(report.deviationRate * 100).toFixed(2)}%`,
      deviationType: this.formatDeviationType(report.deviationType),
      reason: report.reason,
      status: formatStatus(report.status, COMMON_STATUS_MAP),
      reportedAt: formatDate(report.reportedAt),
    };
  }

  public buildDeviationWhere(dto: ExportDeviationReportsDto): any {
    const where: any = { deletedAt: null };

    if (dto.status) where.status = dto.status;
    if (dto.deviationType) where.deviationType = dto.deviationType;

    addDateRange(where, 'reportedAt', dto.startDate, dto.endDate);
    return where;
  }

  public formatDeviationType(type: string): string {
    const map: Record<string, string> = {
      out_of_range: '超出范围',
      below_min: '低于最小值',
      above_max: '超过最大值',
      invalid_value: '无效值',
    };
    return map[type] || type;
  }
}
