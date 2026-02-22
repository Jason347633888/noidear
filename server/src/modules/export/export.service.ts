import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import {
  ExportDocumentsDto,
  ExportTasksDto,
  ExportTaskRecordsDto,
  ExportDeviationReportsDto,
  ExportApprovalsDto,
} from './dto';

interface FieldConfig {
  key: string;
  label: string;
  width?: number;
}

interface TemplateField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: { label: string; value: string | number }[];
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

  async exportDocuments(dto: ExportDocumentsDto, user?: any): Promise<Buffer> {
    const where = this.buildDocumentWhere(dto);

    // HIGH-1: 服务层权限过滤（BR-028, BR-313）
    if (user) {
      if (user.role === 'user') {
        // 普通用户：只能导出自己创建的
        where.creatorId = user.id;
      } else if (user.role === 'leader') {
        // 部门领导：只能导出本部门的
        where.creator = { departmentId: user.departmentId };
      }
      // admin 不添加额外过滤，可以导出所有数据
    }

    const fields = this.getFilteredFields(this.documentFields, dto.fields);
    const total = await this.prisma.document.count({ where });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('文档列表');
    this.setupWorksheet(worksheet, fields);

    await this.fillDocuments(worksheet, where, total, fields);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportTasks(dto: ExportTasksDto, user?: any): Promise<Buffer> {
    const where = this.buildTaskWhere(dto);

    // HIGH-1: 服务层权限过滤（BR-028, BR-313）
    if (user) {
      if (user.role === 'user') {
        // 普通用户：只能导出分配给自己的任务
        where.taskRecords = {
          some: { submitterId: user.id },
        };
      } else if (user.role === 'leader') {
        // 部门领导：只能导出本部门的任务
        where.departmentId = user.departmentId;
      }
      // admin 不添加额外过滤
    }

    const fields = this.getFilteredFields(this.taskFields, dto.fields);
    const total = await this.prisma.task.count({ where });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('任务列表');
    this.setupWorksheet(worksheet, fields);

    await this.fillTasks(worksheet, where, total, fields);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportTaskRecords(dto: ExportTaskRecordsDto, user?: any): Promise<Buffer> {
    const where = this.buildTaskRecordWhere(dto);

    // HIGH-1: 服务层权限过滤（BR-028, BR-313）
    if (user) {
      if (user.role === 'user') {
        // 普通用户：只能导出自己提交的记录
        where.submitterId = user.id;
      } else if (user.role === 'leader') {
        // 部门领导：只能导出本部门的记录
        where.submitter = { departmentId: user.departmentId };
      }
      // admin 不添加额外过滤
    }

    const total = await this.prisma.taskRecord.count({ where });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('任务记录');

    await this.fillTaskRecords(worksheet, where, total);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportDeviationReports(dto: ExportDeviationReportsDto, user?: any): Promise<Buffer> {
    const where = this.buildDeviationWhere(dto);

    // HIGH-1: 服务层权限过滤（BR-028, BR-313）
    if (user) {
      if (user.role === 'user') {
        // 普通用户：只能导出自己创建的偏离报告
        where.creatorId = user.id;
      } else if (user.role === 'leader') {
        // 部门领导：只能导出本部门的偏离报告
        where.creator = { departmentId: user.departmentId };
      }
      // admin 不添加额外过滤
    }

    const fields = this.getFilteredFields(this.deviationFields, dto.fields);
    const total = await this.prisma.deviationReport.count({ where });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('偏离报告');
    this.setupWorksheet(worksheet, fields);

    await this.fillDeviations(worksheet, where, total, fields);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportApprovals(dto: ExportApprovalsDto, user?: any): Promise<Buffer> {
    const where = this.buildApprovalWhere(dto);

    // HIGH-1: 服务层权限过滤（BR-028, BR-313）
    if (user) {
      if (user.role === 'user') {
        // 普通用户：只能导出与自己相关的审批（作为审批人或文档创建人）
        where.OR = [
          { approverId: user.id },
          { document: { creatorId: user.id } },
        ];
      } else if (user.role === 'leader') {
        // 部门领导：只能导出本部门的审批
        where.approver = { departmentId: user.departmentId };
      }
      // admin 不添加额外过滤
    }

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
    if (dto.departmentId) {
      where.creator = { departmentId: dto.departmentId };
    }
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

  private buildTaskRecordWhere(dto: ExportTaskRecordsDto): any {
    const where: any = { deletedAt: null };

    if (dto.taskRecordIds && dto.taskRecordIds.length > 0) {
      where.id = { in: dto.taskRecordIds };
    }

    if (dto.taskId) where.taskId = dto.taskId;
    if (dto.templateId) where.templateId = dto.templateId;
    if (dto.status) where.status = dto.status;
    if (dto.submitterId) where.submitterId = dto.submitterId;

    this.addDateRange(where, 'submittedAt', dto.startDate, dto.endDate);
    return where;
  }

  private async fillTaskRecords(
    worksheet: ExcelJS.Worksheet,
    where: any,
    total: number
  ) {
    const pageSize = 1000;
    let page = 0;

    while (page * pageSize < total) {
      const records = await this.prisma.taskRecord.findMany({
        where,
        skip: page * pageSize,
        take: pageSize,
        orderBy: { submittedAt: 'desc' },
        include: {
          template: { select: { id: true, title: true, fieldsJson: true } },
          submitter: { select: { name: true } },
        },
      });

      if (records.length === 0) break;

      // Generate columns from first record's template
      if (page === 0 && records.length > 0) {
        const templateFields = records[0].template.fieldsJson as unknown as TemplateField[];
        this.setupTaskRecordWorksheet(worksheet, templateFields);
      }

      records.forEach((record: any) => {
        const row = this.mapTaskRecordRow(record);
        worksheet.addRow(row);
      });
      page++;
    }
  }

  private setupTaskRecordWorksheet(
    worksheet: ExcelJS.Worksheet,
    templateFields: TemplateField[]
  ) {
    const fixedColumns = [
      { header: '记录ID', key: 'id', width: 20 },
      { header: '模板名称', key: 'templateTitle', width: 30 },
      { header: '状态', key: 'status', width: 15 },
      { header: '提交人', key: 'submitterName', width: 15 },
      { header: '提交时间', key: 'submittedAt', width: 20 },
    ];

    const dynamicColumns = templateFields.map((field) => ({
      header: field.label,
      key: `field_${field.name}`,
      width: 20,
    }));

    worksheet.columns = [...fixedColumns, ...dynamicColumns];
  }

  private mapTaskRecordRow(record: any): any {
    const templateFields = record.template.fieldsJson as unknown as TemplateField[];
    const dataJson = record.dataJson as unknown as Record<string, any>;

    const row: any = {
      id: record.id,
      templateTitle: record.template.title,
      status: this.formatStatus(record.status),
      submitterName: record.submitter?.name || '',
      submittedAt: record.submittedAt ? this.formatDate(record.submittedAt) : '',
    };

    // Add dynamic field values
    templateFields.forEach((field) => {
      const value = dataJson[field.name];
      row[`field_${field.name}`] = this.formatFieldValue(value, field);
    });

    return row;
  }

  private formatFieldValue(value: any, field: TemplateField): string {
    if (value === null || value === undefined) return '';

    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'email':
      case 'phone':
      case 'url':
        return String(value);

      case 'number':
      case 'slider':
      case 'rate':
        return String(value);

      case 'date':
      case 'time':
      case 'datetime':
        return this.formatDate(new Date(value));

      case 'select':
      case 'radio':
        if (field.options) {
          const option = field.options.find((opt) => opt.value === value);
          return option ? option.label : String(value);
        }
        return String(value);

      case 'checkbox':
        if (Array.isArray(value)) {
          if (field.options) {
            return value
              .map((v) => {
                const option = field.options!.find((opt) => opt.value === v);
                return option ? option.label : String(v);
              })
              .join(', ');
          }
          return value.join(', ');
        }
        return String(value);

      case 'boolean':
      case 'switch':
        return value === true ? '是' : '否';

      case 'file':
      case 'image':
        // Convert to full MinIO URL
        if (typeof value === 'string' && value.startsWith('/')) {
          return `${process.env.MINIO_ENDPOINT}${value}`;
        }
        return String(value);

      case 'richtext':
        return this.stripHtmlTags(String(value));

      case 'cascader':
        if (Array.isArray(value)) {
          return value.join(' / ');
        }
        return String(value);

      case 'color':
        return String(value);

      // CRITICAL-3: Add 4 missing field types
      case 'signature':
        // Export MinIO URL or placeholder
        if (typeof value === 'string' && value.startsWith('/')) {
          return `${process.env.MINIO_ENDPOINT}${value}`;
        }
        return value ? '[签名图片]' : '';

      case 'location':
        // Export "lat,lng" format
        if (typeof value === 'object' && value.lat && value.lng) {
          return `${value.lat},${value.lng}`;
        }
        return String(value);

      case 'qrcode':
      case 'barcode':
        // Export scan result
        return String(value);

      case 'tree':
        // Export path joined with ' / '
        if (Array.isArray(value)) {
          return value.join(' / ');
        }
        return String(value);

      default:
        return String(value);
    }
  }

  private stripHtmlTags(html: string): string {
    if (!html) return '';
    // Remove HTML tags using regex
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  // CRITICAL-1 修复: 添加统计数据导出方法
  async exportDocumentStatistics(stats: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // 总体统计
    const summarySheet = workbook.addWorksheet('总体统计');
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 30 },
      { header: '数值', key: 'value', width: 20 },
    ];
    summarySheet.addRow({ metric: '文档总数', value: stats.total });
    summarySheet.addRow({ metric: '增长率', value: `${stats.growthRate}%` });

    // 按级别统计
    const levelSheet = workbook.addWorksheet('按级别统计');
    levelSheet.columns = [
      { header: '级别', key: 'level', width: 15 },
      { header: '数量', key: 'count', width: 15 },
      { header: '占比', key: 'percentage', width: 15 },
    ];
    stats.byLevel.forEach((item: any) => {
      levelSheet.addRow({
        level: `${item.level}级`,
        count: item.count,
        percentage: `${item.percentage}%`,
      });
    });

    // 按状态统计
    const statusSheet = workbook.addWorksheet('按状态统计');
    statusSheet.columns = [
      { header: '状态', key: 'status', width: 15 },
      { header: '数量', key: 'count', width: 15 },
      { header: '占比', key: 'percentage', width: 15 },
    ];
    stats.byStatus.forEach((item: any) => {
      statusSheet.addRow({
        status: this.formatStatus(item.status),
        count: item.count,
        percentage: `${item.percentage}%`,
      });
    });

    // 按部门统计
    const deptSheet = workbook.addWorksheet('按部门统计');
    deptSheet.columns = [
      { header: '部门名称', key: 'name', width: 30 },
      { header: '文档数量', key: 'count', width: 15 },
    ];
    stats.byDepartment.forEach((item: any) => {
      deptSheet.addRow({ name: item.name, count: item.count });
    });

    // 趋势统计
    const trendSheet = workbook.addWorksheet('趋势统计');
    trendSheet.columns = [
      { header: '日期', key: 'date', width: 20 },
      { header: '文档数量', key: 'count', width: 15 },
    ];
    stats.trend.forEach((item: any) => {
      trendSheet.addRow({ date: item.date, count: item.count });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportTaskStatistics(stats: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // 总体统计
    const summarySheet = workbook.addWorksheet('总体统计');
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 30 },
      { header: '数值', key: 'value', width: 20 },
    ];
    summarySheet.addRow({ metric: '任务总数', value: stats.total });
    summarySheet.addRow({ metric: '已完成', value: stats.completed });
    summarySheet.addRow({ metric: '已逾期', value: stats.overdue });
    summarySheet.addRow({ metric: '完成率', value: `${stats.completionRate}%` });
    summarySheet.addRow({ metric: '逾期率', value: `${stats.overdueRate}%` });
    summarySheet.addRow({ metric: '平均完成时间(小时)', value: stats.avgCompletionTime });

    // 按部门统计
    const deptSheet = workbook.addWorksheet('按部门统计');
    deptSheet.columns = [
      { header: '部门名称', key: 'name', width: 30 },
      { header: '任务数量', key: 'count', width: 15 },
      { header: '完成率', key: 'completionRate', width: 15 },
    ];
    stats.byDepartment.forEach((item: any) => {
      deptSheet.addRow({
        name: item.name,
        count: item.count,
        completionRate: `${item.completionRate}%`,
      });
    });

    // 按模板统计
    const templateSheet = workbook.addWorksheet('按模板统计');
    templateSheet.columns = [
      { header: '模板名称', key: 'name', width: 30 },
      { header: '任务数量', key: 'count', width: 15 },
    ];
    stats.byTemplate.forEach((item: any) => {
      templateSheet.addRow({ name: item.name, count: item.count });
    });

    // 按状态统计
    const statusSheet = workbook.addWorksheet('按状态统计');
    statusSheet.columns = [
      { header: '状态', key: 'status', width: 15 },
      { header: '数量', key: 'count', width: 15 },
    ];
    stats.byStatus.forEach((item: any) => {
      statusSheet.addRow({
        status: this.formatStatus(item.status),
        count: item.count,
      });
    });

    // 趋势统计
    const trendSheet = workbook.addWorksheet('趋势统计');
    trendSheet.columns = [
      { header: '日期', key: 'date', width: 20 },
      { header: '已创建', key: 'created', width: 15 },
      { header: '已完成', key: 'completed', width: 15 },
    ];
    stats.trend.forEach((item: any) => {
      trendSheet.addRow({
        date: item.date,
        created: item.created,
        completed: item.completed,
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportApprovalStatistics(stats: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // 总体统计
    const summarySheet = workbook.addWorksheet('总体统计');
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 30 },
      { header: '数值', key: 'value', width: 20 },
    ];
    summarySheet.addRow({ metric: '审批总数', value: stats.total });
    summarySheet.addRow({ metric: '已通过', value: stats.approved });
    summarySheet.addRow({ metric: '已驳回', value: stats.rejected });
    summarySheet.addRow({ metric: '待审批', value: stats.pending });
    summarySheet.addRow({ metric: '通过率', value: `${stats.approvalRate}%` });
    summarySheet.addRow({ metric: '平均审批时间(小时)', value: stats.avgApprovalTime });

    // 按审批人统计
    const approverSheet = workbook.addWorksheet('按审批人统计');
    approverSheet.columns = [
      { header: '审批人', key: 'name', width: 20 },
      { header: '已通过', key: 'approved', width: 15 },
      { header: '已驳回', key: 'rejected', width: 15 },
      { header: '平均审批时间(小时)', key: 'avgTime', width: 20 },
    ];
    stats.byApprover.forEach((item: any) => {
      approverSheet.addRow({
        name: item.name,
        approved: item.approved,
        rejected: item.rejected,
        avgTime: item.avgTime,
      });
    });

    // 趋势统计
    const trendSheet = workbook.addWorksheet('趋势统计');
    trendSheet.columns = [
      { header: '日期', key: 'date', width: 20 },
      { header: '已通过', key: 'approved', width: 15 },
      { header: '已驳回', key: 'rejected', width: 15 },
    ];
    stats.trend.forEach((item: any) => {
      trendSheet.addRow({
        date: item.date,
        approved: item.approved,
        rejected: item.rejected,
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
