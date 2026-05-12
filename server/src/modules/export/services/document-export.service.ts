import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExportDocumentsDto } from '../dto';
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

const DOCUMENT_FIELDS: FieldConfig[] = [
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

@Injectable()
export class DocumentExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportDocuments(dto: ExportDocumentsDto, user?: any): Promise<Buffer> {
    const where = this.buildDocumentWhere(dto);

    if (user) {
      if (user.roleCode === 'user') {
        where.creatorId = user.id;
      } else if (user.roleCode === 'leader') {
        where.creator = { departmentId: user.departmentId };
      }
    }

    const fields = getFilteredFields(DOCUMENT_FIELDS, dto.fields);
    const total = await this.prisma.document.count({ where });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('文档列表');
    setupWorksheet(worksheet, fields);

    await this.fillDocuments(worksheet, where, total, fields);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  public async fillDocuments(
    worksheet: ExcelJS.Worksheet,
    where: any,
    total: number,
    fields: FieldConfig[],
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
        worksheet.addRow(filterRow(row, fields));
      });
      page++;
    }
  }

  public mapDocumentRow(doc: any): Record<string, unknown> {
    return {
      number: doc.number,
      title: doc.title,
      level: doc.level,
      version: doc.version.toString(),
      status: formatStatus(doc.status, COMMON_STATUS_MAP),
      creatorName: doc.creator?.name || '',
      createdAt: formatDate(doc.createdAt),
      approverName: doc.approver?.name || '',
      approvedAt: doc.approvedAt ? formatDate(doc.approvedAt) : '',
    };
  }

  public buildDocumentWhere(dto: ExportDocumentsDto): any {
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

    addDateRange(where, 'createdAt', dto.startDate, dto.endDate);
    return where;
  }
}
