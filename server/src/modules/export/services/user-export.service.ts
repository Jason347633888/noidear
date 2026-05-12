import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExportUsersDto } from '../dto';
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

const USER_FIELDS: FieldConfig[] = [
  { key: 'username', label: '用户名', width: 20 },
  { key: 'name', label: '姓名', width: 20 },
  { key: 'role', label: '角色', width: 15 },
  { key: 'departmentName', label: '部门', width: 20 },
  { key: 'status', label: '状态', width: 15 },
  { key: 'createdAt', label: '创建时间', width: 20 },
];

@Injectable()
export class UserExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportUsers(dto: ExportUsersDto): Promise<Buffer> {
    const where = this.buildUserWhere(dto);
    const fields = getFilteredFields(USER_FIELDS, dto.fields);
    const total = await this.prisma.user.count({ where });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('用户列表');
    setupWorksheet(worksheet, fields);

    await this.fillUsers(worksheet, where, total, fields);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  public async fillUsers(
    worksheet: ExcelJS.Worksheet,
    where: any,
    total: number,
    fields: FieldConfig[],
  ) {
    const pageSize = 1000;
    let page = 0;

    while (page * pageSize < total) {
      const users = await this.prisma.user.findMany({
        where,
        skip: page * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { name: true } },
          roleObj: { select: { code: true } },
        },
      });

      users.forEach((user: any) => {
        const row = {
          username: user.username,
          name: user.name,
          role: this.formatUserRole(user.roleObj?.code ?? ''),
          departmentName: user.department?.name || '未分配',
          status: formatStatus(user.status, COMMON_STATUS_MAP),
          createdAt: formatDate(user.createdAt),
        };
        worksheet.addRow(filterRow(row, fields));
      });
      page++;
    }
  }

  public formatUserRole(role: string): string {
    const map: Record<string, string> = {
      admin: '管理员',
      leader: '部门主管',
      user: '普通用户',
    };
    return map[role] || role;
  }

  public buildUserWhere(dto: ExportUsersDto): any {
    const where: any = { deletedAt: null };

    if (dto.roleId) where.roleId = dto.roleId;
    if (dto.status) where.status = dto.status;
    if (dto.departmentId) where.departmentId = dto.departmentId;

    addDateRange(where, 'createdAt', dto.startDate, dto.endDate);
    return where;
  }
}
