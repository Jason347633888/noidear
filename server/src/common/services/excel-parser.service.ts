import * as XLSX from 'xlsx';
import { Injectable } from '@nestjs/common';
import { BusinessException, ErrorCode } from '../exceptions/business.exception';

export interface ParsedField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: { label: string; value: string | number }[];
}

export interface ParseResult {
  fields: ParsedField[];
  preview: Record<string, unknown>[];
}

@Injectable()
export class ExcelParserService {
  /**
   * 解析 Excel 文件为模板字段定义
   */
  parseToTemplateFields(buffer: Buffer): ParseResult {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // 解析字段定义（第一行作为字段名，第二行作为标签，第三行作为类型）
      const fields = this.parseFieldDefinitions(sheet);

      // 解析预览数据（从第四行开始）
      const preview = this.parsePreviewData(sheet, fields.length);

      return { fields, preview };
    } catch (error) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'Excel 解析失败，请检查文件格式',
        error,
      );
    }
  }

  /**
   * 解析字段定义
   */
  private parseFieldDefinitions(sheet: XLSX.WorkSheet): ParsedField[] {
    const fields: ParsedField[] = [];
    let colIndex = 0;

    while (true) {
      const nameCell = sheet[XLSX.utils.encode_cell({ r: 0, c: colIndex })];
      const labelCell = sheet[XLSX.utils.encode_cell({ r: 1, c: colIndex })];
      const typeCell = sheet[XLSX.utils.encode_cell({ r: 2, c: colIndex })];

      if (!nameCell || !labelCell || !typeCell) break;

      const name = String(nameCell.v);
      const label = String(labelCell.v);
      const type = String(typeCell.v).toLowerCase();

      // 解析选项（如果有）
      let options: ParsedField['options'];
      if (type === 'select') {
        options = this.parseOptions(sheet, colIndex);
      }

      fields.push({
        name,
        label,
        type: this.mapExcelTypeToFieldType(type),
        required: true,
        options,
      });

      colIndex++;
    }

    return fields;
  }

  /**
   * 解析选项列表
   */
  private parseOptions(sheet: XLSX.WorkSheet, colIndex: number): ParsedField['options'] {
    const options: ParsedField['options'] = [];
    let rowIndex = 3;

    while (true) {
      const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })];
      if (!cell || cell.v === undefined || cell.v === null) break;

      const value = String(cell.v);
      options.push({ label: value, value });
      rowIndex++;
    }

    return options.length > 0 ? options : undefined;
  }

  /**
   * 解析预览数据
   */
  private parsePreviewData(sheet: XLSX.WorkSheet, fieldCount: number): Record<string, unknown>[] {
    const preview: Record<string, unknown>[] = [];
    let rowIndex = 3;

    while (true) {
      const row: Record<string, unknown> = {};
      let hasData = false;

      for (let colIndex = 0; colIndex < fieldCount; colIndex++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })];
        if (cell && cell.v !== undefined && cell.v !== null) {
          row[`field_${colIndex}`] = cell.v;
          hasData = true;
        }
      }

      if (!hasData) break;
      preview.push(row);
      rowIndex++;

      // 最多返回 10 条预览数据
      if (preview.length >= 10) break;
    }

    return preview;
  }

  /**
   * 将 Excel 类型映射为字段类型
   */
  private mapExcelTypeToFieldType(excelType: string): string {
    const map: Record<string, string> = {
      text: 'text',
      文本: 'text',
      number: 'number',
      数字: 'number',
      date: 'date',
      日期: 'date',
      select: 'select',
      选择: 'select',
      textarea: 'textarea',
      多行文本: 'textarea',
      boolean: 'boolean',
      布尔: 'boolean',
    };
    return map[excelType] || 'text';
  }

  /**
   * 导出数据到 Excel
   */
  exportToExcel(data: Record<string, unknown>[], fields: ParsedField[]): Buffer {
    const headers = fields.map((f) => f.label);
    const rows = data.map((row) =>
      fields.map((field) => row[field.name] ?? ''),
    );

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  /**
   * 验证 Excel 文件格式
   */
  validateFormat(buffer: Buffer): { valid: boolean; error?: string } {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      if (workbook.SheetNames.length === 0) {
        return { valid: false, error: 'Excel 文件没有工作表' };
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const nameCell = sheet['A1'];
      const labelCell = sheet['A2'];
      const typeCell = sheet['A3'];

      if (!nameCell || !labelCell || !typeCell) {
        return { valid: false, error: 'Excel 文件格式不正确，需要至少 3 行字段定义' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: '无法解析 Excel 文件' };
    }
  }
}
