import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import {
  ExportDocumentsDto,
  ExportTasksDto,
  ExportDeviationReportsDto,
  ExportApprovalsDto,
} from './dto';

interface FieldConfig {
  key: string;
  label: string;
  width?: number;
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly documentFields: FieldConfig[] = [
    { key: 'number', label: '文档编号', width: 20 },
    { key: 'title', label: '标题', width: 30 },
    { key: 'level', label: '级别', width: 10 },
    { key: 'version', label: '版本', width: 10 },
    { key: 'status', label: '状态', width: 15 },
    { key: 'creatorName', label: '创建人', width: 15 },
    { key: 'createdAt', label: '创建时间', width: 20 },
    { key: 'approverName', label: '审批人', width: 15 },
    { key: 'approvedAt', label: '审批时间', width: 20 },
  ];

  private readonly taskFields: FieldConfig[] = [
    { key: 'templateTitle', label: '模板名称', width: 30 },
    { key: 'departmentName', label: '部门', width: 20 },
    { key: 'deadline', label: '截止日期', width: 20 },
    { key: 'status', label: '状态', width: 15 },
    { key: 'creatorName', label: '创建人', width: 15 },
    { key: 'createdAt', label: '创建时间', width: 20 },
  ];

  private readonly deviationFields: FieldConfig[] = [
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

  private readonly approvalFields: FieldConfig[] = [
    { key: 'documentNumber', label: '文档编号', width: 20 },
    { key: 'documentTitle', label: '文档标题', width: 30 },
    { key: 'approverName', label: '审批人', width: 15 },
    { key: 'status', label: '状态', width: 15 },
    { key: 'comment', label: '意见', width: 30 },
    { key: 'createdAt', label: '创建时间', width: 20 },
    { key: 'approvedAt', label: '审批时间', width: 20 },
  ];

  async exportDocuments(dto: ExportDocumentsDto): Promise<Buffer> {
    const where = this.buildDocumentWhere(dto);
    const fields = this.getFilteredFields(this.documentFields, dto.fields);
    const total = await this.prisma.document.count({ where });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('文档列表');
    this.setupWorksheet(worksheet, fields);

    await this.fillDocuments(worksheet, where, total, fields);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportTasks(dto: ExportTasksDto): Promise<Buffer> {
    const where = this.buildTaskWhere(dto);
    const fields = this.getFilteredFields(this.taskFields, dto.fields);
    const total = await this.prisma.task.count({ where });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('任务列表');
    this.setupWorksheet(worksheet, fields);

    await this.fillTasks(worksheet, where, total, fields);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportDeviationReports(dto: ExportDeviationReportsDto): Promise<Buffer> {
    const where = this.buildDeviationWhere(dto);
    const fields = this.getFilteredFields(this.deviationFields, dto.fields);
    const total = await this.prisma.deviationReport.count({ where });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('偏离报告');
    this.setupWorksheet(worksheet, fields);

    await this.fillDeviations(worksheet, where, total, fields);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportApprovals(dto: ExportApprovalsDto): Promise<Buffer> {
    const where = this.buildApprovalWhere(dto);
    const fields = this.getFilteredFields(this.approvalFields, dto.fields);
    const total = await this.prisma.approval.count({ where });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('审批记录');
    this.setupWorksheet(worksheet, fields);

    await this.fillApprovals(worksheet, where, total, fields);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private setupWorksheet(worksheet: ExcelJS.Worksheet, fields: FieldConfig[]) {
    worksheet.columns = fields.map(f => ({
      header: f.label,
      key: f.key,
      width: f.width,
    }));
  }

  private async fillDocuments(
    worksheet: ExcelJS.Worksheet,
    where: any,
    total: number,
    fields: FieldConfig[]
  ) {
    const pageSize = 1000;
    let page = 0;

    while (page * pageSize < total) {
      const documents = await this.prisma.document.findMany({
        where,
        skip: page * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
        },
      });

      documents.forEach((doc: any) => {
        const row = this.mapDocumentRow(doc);
        worksheet.addRow(this.filterRow(row, fields));
      });
      page++;
    }
  }

  private async fillTasks(
    worksheet: ExcelJS.Worksheet,
    where: any,
    total: number,
    fields: FieldConfig[]
  ) {
    const pageSize = 1000;
    let page = 0;

    while (page * pageSize < total) {
      const tasks = await this.prisma.task.findMany({
        where,
        skip: page * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { title: true } },
          department: { select: { name: true } },
          creator: { select: { name: true } },
        },
      });

      tasks.forEach((task: any) => {
        const row = this.mapTaskRow(task);
        worksheet.addRow(this.filterRow(row, fields));
      });
      page++;
    }
  }

  private async fillDeviations(
    worksheet: ExcelJS.Worksheet,
    where: any,
    total: number,
    fields: FieldConfig[]
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
        worksheet.addRow(this.filterRow(row, fields));
      });
      page++;
    }
  }

  private async fillApprovals(
    worksheet: ExcelJS.Worksheet,
    where: any,
    total: number,
    fields: FieldConfig[]
  ) {
    const pageSize = 1000;
    let page = 0;

    while (page * pageSize < total) {
      const approvals = await this.prisma.approval.findMany({
        where,
        skip: page * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          approver: { select: { name: true } },
          document: { select: { number: true, title: true } },
        },
      });

      approvals.forEach((approval: any) => {
        const row = this.mapApprovalRow(approval);
        worksheet.addRow(this.filterRow(row, fields));
      });
      page++;
    }
  }

  private buildDocumentWhere(dto: ExportDocumentsDto): any {
    const where: any = { deletedAt: null };

    if (dto.level !== undefined) where.level = dto.level;
    if (dto.status) where.status = dto.status;
    if (dto.keyword) {
      where.OR = [
        { title: { contains: dto.keyword } },
        { number: { contains: dto.keyword } },
      ];
    }

    this.addDateRange(where, 'createdAt', dto.startDate, dto.endDate);
    return where;
  }

  private buildTaskWhere(dto: ExportTasksDto): any {
    const where: any = { deletedAt: null };

    if (dto.status) where.status = dto.status;
    if (dto.departmentId) where.departmentId = dto.departmentId;

    this.addDateRange(where, 'createdAt', dto.startDate, dto.endDate);
    return where;
  }

  private buildDeviationWhere(dto: ExportDeviationReportsDto): any {
    const where: any = { deletedAt: null };

    if (dto.status) where.status = dto.status;
    if (dto.deviationType) where.deviationType = dto.deviationType;

    this.addDateRange(where, 'reportedAt', dto.startDate, dto.endDate);
    return where;
  }

  private buildApprovalWhere(dto: ExportApprovalsDto): any {
    const where: any = {};

    if (dto.status) where.status = dto.status;
    if (dto.approverId) where.approverId = dto.approverId;

    this.addDateRange(where, 'createdAt', dto.startDate, dto.endDate);
    return where;
  }

  private addDateRange(where: any, field: string, start?: string, end?: string) {
    if (start || end) {
      where[field] = {};
      if (start) where[field].gte = new Date(start);
      if (end) where[field].lte = new Date(end);
    }
  }

  private mapDocumentRow(doc: any): any {
    return {
      number: doc.number,
      title: doc.title,
      level: doc.level,
      version: doc.version.toString(),
      status: this.formatStatus(doc.status),
      creatorName: doc.creator?.name || '',
      createdAt: this.formatDate(doc.createdAt),
      approverName: doc.approver?.name || '',
      approvedAt: doc.approvedAt ? this.formatDate(doc.approvedAt) : '',
    };
  }

  private mapTaskRow(task: any): any {
    return {
      templateTitle: task.template.title,
      departmentName: task.department.name,
      deadline: this.formatDate(task.deadline),
      status: this.formatStatus(task.status),
      creatorName: task.creator.name,
      createdAt: this.formatDate(task.createdAt),
    };
  }

  private mapDeviationRow(report: any): any {
    return {
      fieldName: report.fieldName,
      expectedValue: report.expectedValue,
      actualValue: report.actualValue,
      deviationAmount: report.deviationAmount,
      deviationRate: `${(report.deviationRate * 100).toFixed(2)}%`,
      deviationType: this.formatDeviationType(report.deviationType),
      reason: report.reason,
      status: this.formatStatus(report.status),
      reportedAt: this.formatDate(report.reportedAt),
    };
  }

  private mapApprovalRow(approval: any): any {
    return {
      documentNumber: approval.document?.number || '',
      documentTitle: approval.document?.title || '',
      approverName: approval.approver.name,
      status: this.formatStatus(approval.status),
      comment: approval.comment || '',
      createdAt: this.formatDate(approval.createdAt),
      approvedAt: approval.approvedAt ? this.formatDate(approval.approvedAt) : '',
    };
  }

  private getFilteredFields(allFields: FieldConfig[], selected?: string[]): FieldConfig[] {
    if (!selected || selected.length === 0) return allFields;
    return allFields.filter(f => selected.includes(f.key));
  }

  private filterRow(row: any, fields: FieldConfig[]): any {
    const filtered: any = {};
    fields.forEach(f => { filtered[f.key] = row[f.key]; });
    return filtered;
  }

  private formatDate(date: Date | null): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  private formatStatus(status: string): string {
    const map: Record<string, string> = {
      draft: '草稿',
      pending: '待审批',
      approved: '已审批',
      rejected: '已驳回',
      inactive: '已停用',
      completed: '已完成',
    };
    return map[status] || status;
  }

  private formatDeviationType(type: string): string {
    const map: Record<string, string> = {
      out_of_range: '超出范围',
      below_min: '低于最小值',
      above_max: '超过最大值',
      invalid_value: '无效值',
    };
    return map[type] || type;
  }
}
