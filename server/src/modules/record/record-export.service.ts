import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const JSZip = require('jszip');
import { PrismaService } from '../../prisma/prisma.service';
import { ExportRecordsDto } from './dto/export-records.dto';

interface TemplateField {
  name?: string;
  key?: string;
  label?: string;
  type?: string;
  options?: { label: string; value: string | number | boolean }[];
}

interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  submitted: '已提交',
  signed: '已签署',
  approved: '已通过',
  rejected: '已驳回',
};

const MAX_RECORD_EXPORT_ROWS = 10000;

@Injectable()
export class RecordExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportRecords(dto: ExportRecordsDto): Promise<ExportResult> {
    const where = this.buildWhere(dto);
    const total = await this.prisma.record.count({ where });

    if (total === 0) {
      throw new BadRequestException('没有可导出的记录');
    }

    if (total > MAX_RECORD_EXPORT_ROWS) {
      throw new BadRequestException(`记录导出最多支持 ${MAX_RECORD_EXPORT_ROWS} 条，请缩小筛选范围`);
    }

    const records = await this.prisma.record.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: MAX_RECORD_EXPORT_ROWS,
      include: {
        template: true,
        creator: { select: { id: true, name: true, username: true } },
      },
    });

    const groups = new Map<string, any[]>();
    for (const record of records) {
      const key = record.templateId;
      groups.set(key, [...(groups.get(key) ?? []), record]);
    }

    if (groups.size === 1) {
      const [templateRecords] = groups.values();
      const workbookBuffer = await this.buildWorkbook(templateRecords, dto.fields);
      const templateName = this.safeFileName(templateRecords[0].template?.name ?? '记录');
      return {
        buffer: workbookBuffer,
        filename: `${templateName}-记录导出.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    const zip = new JSZip();
    for (const templateRecords of groups.values()) {
      const templateName = this.safeFileName(templateRecords[0].template?.name ?? templateRecords[0].templateId);
      zip.file(`${templateName}.xlsx`, await this.buildWorkbook(templateRecords, dto.fields));
    }

    return {
      buffer: Buffer.from(await zip.generateAsync({ type: 'nodebuffer' })),
      filename: `记录导出-${new Date().toISOString().slice(0, 10)}.zip`,
      contentType: 'application/zip',
    };
  }

  private buildWhere(dto: ExportRecordsDto) {
    const where: any = { deletedAt: null };
    if (dto.recordIds?.length) where.id = { in: dto.recordIds };
    if (dto.status && dto.status !== 'all') {
      where.status = dto.status;
    } else {
      where.status = { in: ['submitted', 'signed', 'approved', 'rejected'] };
    }
    if (dto.templateId) where.templateId = dto.templateId;
    if (dto.keyword) where.number = { contains: dto.keyword };
    if (dto.usageType) where.usageType = dto.usageType;
    if (dto.changeEventId) where.changeEventId = dto.changeEventId;
    if (dto.submitterId) where.createdBy = dto.submitterId;
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) where.createdAt.gte = new Date(dto.startDate);
      if (dto.endDate) where.createdAt.lte = new Date(dto.endDate);
    }
    return where;
  }

  private async buildWorkbook(records: any[], selectedFields?: string[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('记录填写结果');
    const template = records[0].template;
    const fields = this.extractFields(template?.fieldsJson).filter((field) => {
      const key = field.name ?? field.key;
      return !selectedFields?.length || (key ? selectedFields.includes(key) : false);
    });

    worksheet.columns = [
      { header: '记录编号', key: 'number', width: 24 },
      { header: '模板名称', key: 'templateName', width: 28 },
      { header: '状态', key: 'status', width: 14 },
      { header: '填写人', key: 'creatorName', width: 18 },
      { header: '创建时间', key: 'createdAt', width: 22 },
      { header: '提交时间', key: 'submittedAt', width: 22 },
      ...fields.map((field) => ({
        header: field.label ?? field.name ?? field.key ?? '字段',
        key: field.name ?? field.key ?? '',
        width: 22,
      })),
    ];

    for (const record of records) {
      const data = (record.dataJson ?? {}) as Record<string, unknown>;
      const row: Record<string, unknown> = {
        number: record.number,
        templateName: template?.name ?? '',
        status: STATUS_LABELS[record.status] ?? record.status,
        creatorName: record.creator?.name ?? record.creator?.username ?? '',
        createdAt: this.formatDate(record.createdAt),
        submittedAt: record.submittedAt ? this.formatDate(record.submittedAt) : '',
      };
      for (const field of fields) {
        const key = field.name ?? field.key;
        if (!key) continue;
        row[key] = this.formatFieldValue(data[key], field);
      }
      worksheet.addRow(row);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private extractFields(fieldsJson: unknown): TemplateField[] {
    if (Array.isArray(fieldsJson)) return fieldsJson as TemplateField[];
    const fields = (fieldsJson as { fields?: TemplateField[] } | null)?.fields;
    return Array.isArray(fields) ? fields : [];
  }

  private formatFieldValue(value: unknown, field: TemplateField): string {
    if (value === null || value === undefined) return '';
    if (field.type === 'richtext') return this.stripHtml(String(value));
    if (['file', 'image', 'photo'].includes(field.type ?? '')) return this.formatFileValue(value);
    if (field.type === 'signature') return this.formatSignatureValue(value);
    if (Array.isArray(value)) return value.map((item) => this.formatOption(item, field)).join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return this.formatOption(value, field);
  }

  private formatFileValue(value: unknown): string {
    const values = Array.isArray(value) ? value : [value];
    return values.map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      if (typeof item !== 'object') return String(item);
      const file = item as { name?: string; fileName?: string; url?: string; path?: string };
      const name = file.name ?? file.fileName ?? '附件';
      const url = file.url ?? file.path;
      return url ? `${name} ${url}` : name;
    }).filter(Boolean).join(', ');
  }

  private formatSignatureValue(value: unknown): string {
    if (!value) return '未签名';
    if (typeof value !== 'string') return '已签名';
    if (value.startsWith('data:image/')) return '已签名';
    return `已签名 ${value}`;
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private formatOption(value: unknown, field: TemplateField): string {
    const option = field.options?.find((item) => item.value === value);
    return option ? option.label : String(value);
  }

  private formatDate(value: Date | string): string {
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  }

  private safeFileName(value: string): string {
    return value.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || '记录';
  }
}
