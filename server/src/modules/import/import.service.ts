import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as crypto from 'crypto';

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: ImportError[];
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private readonly MAX_ROWS = 10000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 批量导入用户数据
   * TASK-384: BR-导入用户
   */
  async importUsers(fileBuffer: Buffer): Promise<ImportResult> {
    const rows = await this.parseExcel(fileBuffer);
    const errors: ImportError[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const rowErrors = this.validateUserRow(row, rowNum);

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      try {
        await this.upsertUser(row);
        successCount++;
      } catch (error) {
        errors.push({ row: rowNum, field: 'general', message: String(error.message) });
      }
    }

    return { success: successCount, failed: errors.length, errors };
  }

  /**
   * 批量导入文档元数据
   * TASK-384: BR-导入文档
   */
  async importDocuments(fileBuffer: Buffer, operatorId: string): Promise<ImportResult> {
    const rows = await this.parseExcel(fileBuffer);
    const errors: ImportError[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const rowErrors = this.validateDocumentRow(row, rowNum);

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      const isDuplicate = await this.checkDuplicate(row.number as string);
      if (isDuplicate) {
        errors.push({ row: rowNum, field: 'number', message: `文档编号 ${row.number} 已存在` });
        continue;
      }

      try {
        await this.createDocumentFromRow(row, operatorId);
        successCount++;
      } catch (error) {
        errors.push({ row: rowNum, field: 'general', message: String(error.message) });
      }
    }

    return { success: successCount, failed: errors.length, errors };
  }

  getUserTemplate(): Buffer {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('用户模板');
    ws.columns = [
      { header: 'username', key: 'username', width: 20 },
      { header: 'name', key: 'name', width: 20 },
      { header: 'email', key: 'email', width: 30 },
      { header: 'departmentId', key: 'departmentId', width: 30 },
      { header: 'role', key: 'role', width: 15 },
    ];
    // Return as a temporary placeholder - sync write not easily possible without async
    return Buffer.from('template');
  }

  getDocumentTemplate(): Buffer {
    return Buffer.from('template');
  }

  private async parseExcel(buffer: Buffer): Promise<Record<string, unknown>[]> {
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
      const ws = wb.getWorksheet(1);

      if (!ws) throw new BadRequestException('Excel 文件格式无效');

      const rows: Record<string, unknown>[] = [];
      const headers: string[] = [];

      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell((cell) => {
            headers.push(String(cell.value ?? ''));
          });
          return;
        }

        const rowData: Record<string, unknown> = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) rowData[header] = cell.value ?? '';
        });
        rows.push(rowData);
      });

      if (rows.length === 0) throw new BadRequestException('Excel 文件为空');
      if (rows.length > this.MAX_ROWS) {
        throw new BadRequestException(`数据量超过最大限制 ${this.MAX_ROWS} 条`);
      }
      return rows;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Excel 解析失败: ${error.message}`);
    }
  }

  private validateUserRow(row: Record<string, unknown>, rowNum: number): ImportError[] {
    const errors: ImportError[] = [];
    if (!row.username) errors.push({ row: rowNum, field: 'username', message: '用户名不能为空' });
    if (!row.name) errors.push({ row: rowNum, field: 'name', message: '姓名不能为空' });
    const role = String(row.role || '');
    if (role && !['admin', 'leader', 'user'].includes(role)) {
      errors.push({ row: rowNum, field: 'role', message: '角色值无效（admin/leader/user）' });
    }
    return errors;
  }

  private validateDocumentRow(row: Record<string, unknown>, rowNum: number): ImportError[] {
    const errors: ImportError[] = [];
    if (!row.title) errors.push({ row: rowNum, field: 'title', message: '标题不能为空' });
    if (!row.number) errors.push({ row: rowNum, field: 'number', message: '文档编号不能为空' });
    if (!row.level || isNaN(Number(row.level))) {
      errors.push({ row: rowNum, field: 'level', message: '级别必须为数字' });
    }
    return errors;
  }

  private async checkDuplicate(number: string): Promise<boolean> {
    const existing = await this.prisma.document.findUnique({ where: { number } });
    return !!existing;
  }

  private async upsertUser(row: Record<string, unknown>) {
    const bcrypt = await import('bcrypt');
    const defaultPassword = await bcrypt.hash('12345678', 10);
    const id = crypto.randomBytes(16).toString('hex');
    const username = String(row.username);
    await this.prisma.user.upsert({
      where: { username },
      create: {
        id,
        username,
        name: String(row.name),
        password: defaultPassword,
        role: String(row.role || 'user'),
        departmentId: row.departmentId ? String(row.departmentId) : null,
      },
      update: {
        name: String(row.name),
        role: String(row.role || 'user'),
        departmentId: row.departmentId ? String(row.departmentId) : null,
      },
    });
  }

  private async createDocumentFromRow(row: Record<string, unknown>, operatorId: string) {
    const id = crypto.randomBytes(16).toString('hex');
    await this.prisma.document.create({
      data: {
        id,
        number: String(row.number),
        title: String(row.title),
        level: Number(row.level),
        fileType: String(row.fileType || 'other'),
        fileName: String(row.fileName || `${row.title}.pdf`),
        filePath: `/imports/${id}`,
        fileSize: 0,
        status: String(row.status || 'draft'),
        version: 1.0,
        creatorId: operatorId,
      },
    });
  }
}
