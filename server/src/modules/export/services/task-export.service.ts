import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExportTasksDto, ExportTaskRecordsDto } from '../dto';
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

interface TemplateField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: { label: string; value: string | number }[];
}

const TASK_FIELDS: FieldConfig[] = [
  { key: 'templateTitle', label: '模板名称', width: 30 },
  { key: 'departmentName', label: '部门', width: 20 },
  { key: 'deadline', label: '截止日期', width: 20 },
  { key: 'status', label: '状态', width: 15 },
  { key: 'creatorName', label: '创建人', width: 15 },
  { key: 'createdAt', label: '创建时间', width: 20 },
];

@Injectable()
export class TaskExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportTasks(dto: ExportTasksDto, user?: any): Promise<Buffer> {
    const where = this.buildTaskWhere(dto);

    if (user && user.roleCode === 'user') {
      where.createdBy = user.id;
    }

    const fields = getFilteredFields(TASK_FIELDS, dto.fields);
    const total = await this.prisma.record.count({ where });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('记录列表');
    setupWorksheet(worksheet, fields);

    await this.fillTasks(worksheet, where, total, fields);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async exportTaskRecords(dto: ExportTaskRecordsDto, user?: any): Promise<Buffer> {
    const where = this.buildTaskRecordWhere(dto);

    if (user && user.roleCode === 'user') {
      where.createdBy = user.id;
    }

    const total = await this.prisma.record.count({ where });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('记录数据');

    await this.fillTaskRecords(worksheet, where, total);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  public async fillTasks(
    worksheet: ExcelJS.Worksheet,
    where: any,
    total: number,
    fields: FieldConfig[],
  ) {
    const pageSize = 1000;
    let page = 0;

    while (page * pageSize < total) {
      const records = await this.prisma.record.findMany({
        where,
        skip: page * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      });

      records.forEach((record: any) => {
        const row = this.mapRecordRow(record);
        worksheet.addRow(filterRow(row, fields));
      });
      page++;
    }
  }

  public async fillTaskRecords(
    worksheet: ExcelJS.Worksheet,
    where: any,
    total: number,
  ) {
    const pageSize = 1000;
    let page = 0;

    while (page * pageSize < total) {
      const records = await this.prisma.record.findMany({
        where,
        skip: page * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      });

      if (records.length === 0) break;

      records.forEach((record: any) => {
        worksheet.addRow(this.mapRecordRow(record));
      });
      page++;
    }
  }

  public mapTaskRow(task: any): Record<string, unknown> {
    return {
      templateTitle: task.template?.title || '',
      departmentName: task.department?.name || '',
      deadline: task.deadline ? formatDate(task.deadline) : '',
      status: formatStatus(task.status, COMMON_STATUS_MAP),
      creatorName: task.creator?.name || '',
      createdAt: formatDate(task.createdAt),
    };
  }

  public mapRecordRow(record: any): Record<string, unknown> {
    return {
      id: record.id,
      status: formatStatus(record.status, COMMON_STATUS_MAP),
      createdAt: formatDate(record.createdAt),
    };
  }

  public buildTaskWhere(dto: ExportTasksDto): any {
    const where: any = { deletedAt: null };

    if (dto.status) where.status = dto.status;

    addDateRange(where, 'createdAt', dto.startDate, dto.endDate);
    return where;
  }

  public buildTaskRecordWhere(dto: ExportTaskRecordsDto): any {
    const where: any = { deletedAt: null };

    if (dto.status) where.status = dto.status;

    addDateRange(where, 'createdAt', dto.startDate, dto.endDate);
    return where;
  }

  public formatFieldValue(value: any, field: TemplateField): string {
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
        return formatDate(new Date(value));

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

      case 'signature':
        if (typeof value === 'string' && value.startsWith('/')) {
          return `${process.env.MINIO_ENDPOINT}${value}`;
        }
        return value ? '[签名图片]' : '';

      case 'location':
        if (typeof value === 'object' && value.lat && value.lng) {
          return `${value.lat},${value.lng}`;
        }
        return String(value);

      case 'qrcode':
      case 'barcode':
        return String(value);

      case 'tree':
        if (Array.isArray(value)) {
          return value.join(' / ');
        }
        return String(value);

      default:
        return String(value);
    }
  }

  public stripHtmlTags(html: string): string {
    if (!html) return '';
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
}
