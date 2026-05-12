import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExportApprovalsDto } from '../dto';
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

const APPROVAL_FIELDS: FieldConfig[] = [
  { key: 'documentNumber', label: '文档编号', width: 20 },
  { key: 'documentTitle', label: '文档标题', width: 30 },
  { key: 'approverName', label: '审批人', width: 15 },
  { key: 'status', label: '状态', width: 15 },
  { key: 'comment', label: '意见', width: 30 },
  { key: 'createdAt', label: '创建时间', width: 20 },
  { key: 'approvedAt', label: '审批时间', width: 20 },
];

@Injectable()
export class ApprovalExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportApprovals(dto: ExportApprovalsDto, user?: any): Promise<Buffer> {
    const where = this.buildApprovalWhere(dto);

    if (user) {
      if (user.roleCode === 'user') {
        where.OR = [
          { approverId: user.id },
          { document: { creatorId: user.id } },
        ];
      } else if (user.roleCode === 'leader') {
        where.approver = { departmentId: user.departmentId };
      }
    }

    const fields = getFilteredFields(APPROVAL_FIELDS, dto.fields);
    const total = await this.prisma.approval.count({ where });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('审批记录');
    setupWorksheet(worksheet, fields);

    await this.fillApprovals(worksheet, where, total, fields);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  public async fillApprovals(
    worksheet: ExcelJS.Worksheet,
    where: any,
    total: number,
    fields: FieldConfig[],
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
        worksheet.addRow(filterRow(row, fields));
      });
      page++;
    }
  }

  public mapApprovalRow(approval: any): Record<string, unknown> {
    return {
      documentNumber: approval.document?.number || '',
      documentTitle: approval.document?.title || '',
      approverName: approval.approver.name,
      status: formatStatus(approval.status, COMMON_STATUS_MAP),
      comment: approval.comment || '',
      createdAt: formatDate(approval.createdAt),
      approvedAt: approval.approvedAt ? formatDate(approval.approvedAt) : '',
    };
  }

  public buildApprovalWhere(dto: ExportApprovalsDto): any {
    const where: any = {};

    if (dto.status) where.status = dto.status;
    if (dto.approverId) where.approverId = dto.approverId;

    addDateRange(where, 'createdAt', dto.startDate, dto.endDate);
    return where;
  }
}
