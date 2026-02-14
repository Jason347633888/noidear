import * as ExcelJS from 'exceljs';
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

/**
 * Types that require options parsing from data rows
 */
const TYPES_NEEDING_OPTIONS = ['select', 'radio', 'checkbox', 'cascader'];

/** SEC-005: Maximum number of columns allowed in an Excel file */
const MAX_COLUMNS = 100;

/** SEC-005: Maximum number of option rows for select/radio/checkbox/cascader */
const MAX_OPTION_ROWS = 500;

@Injectable()
export class ExcelParserService {
  /**
   * Parse Excel file buffer into template field definitions.
   * Format: Row 1 = names, Row 2 = labels, Row 3 = types, Row 4+ = data
   *
   * SEC-002: Replaced vulnerable `xlsx` library with `exceljs`.
   */
  async parseToTemplateFields(buffer: Buffer): Promise<ParseResult> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const sheet = workbook.getWorksheet(1);
      if (!sheet) {
        throw new Error('No worksheet found');
      }

      const fields = this.parseFieldDefinitions(sheet);
      const preview = this.parsePreviewData(sheet, fields.length);

      return { fields, preview };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'Excel 解析失败，请检查文件格式',
        error,
      );
    }
  }

  /**
   * Parse field definitions from the first 3 rows.
   */
  private parseFieldDefinitions(sheet: ExcelJS.Worksheet): ParsedField[] {
    const fields: ParsedField[] = [];
    let colIndex = 1; // exceljs columns are 1-based

    while (true) {
      const nameCell = sheet.getCell(1, colIndex);
      const labelCell = sheet.getCell(2, colIndex);
      const typeCell = sheet.getCell(3, colIndex);

      const nameValue = this.getCellStringValue(nameCell);
      const labelValue = this.getCellStringValue(labelCell);
      const typeValue = this.getCellStringValue(typeCell);

      if (!nameValue || !labelValue || !typeValue) break;

      if (colIndex > MAX_COLUMNS) {
        throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          `Excel 列数超过最大限制 (${MAX_COLUMNS})，当前列数已超出限制`,
        );
      }

      const mappedType = this.mapExcelTypeToFieldType(typeValue.toLowerCase());

      let options: ParsedField['options'];
      if (TYPES_NEEDING_OPTIONS.includes(mappedType)) {
        options = this.parseOptions(sheet, colIndex);
      }

      fields.push({
        name: nameValue,
        label: labelValue,
        type: mappedType,
        required: true,
        options,
      });

      colIndex++;
    }

    return fields;
  }

  /**
   * Parse option values from data rows for select/radio/checkbox/cascader.
   */
  private parseOptions(
    sheet: ExcelJS.Worksheet,
    colIndex: number,
  ): ParsedField['options'] {
    const options: ParsedField['options'] = [];
    let rowIndex = 4; // data starts at row 4

    while (true) {
      const cell = sheet.getCell(rowIndex, colIndex);
      const value = this.getCellStringValue(cell);

      if (!value) break;

      if (options.length >= MAX_OPTION_ROWS) {
        throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          `选项行数超过最大限制 (${MAX_OPTION_ROWS})`,
        );
      }

      options.push({ label: value, value });
      rowIndex++;
    }

    return options.length > 0 ? options : undefined;
  }

  /**
   * Parse preview data from row 4 onwards. Limit to 10 rows.
   */
  private parsePreviewData(
    sheet: ExcelJS.Worksheet,
    fieldCount: number,
  ): Record<string, unknown>[] {
    const preview: Record<string, unknown>[] = [];
    let rowIndex = 4;

    while (preview.length < 10) {
      const row: Record<string, unknown> = {};
      let hasData = false;

      for (let col = 1; col <= fieldCount; col++) {
        const cell = sheet.getCell(rowIndex, col);
        const rawValue = this.getCellRawValue(cell);

        if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
          row[`field_${col - 1}`] = rawValue;
          hasData = true;
        }
      }

      if (!hasData) break;
      preview.push(row);
      rowIndex++;
    }

    return preview;
  }

  /**
   * Map Excel type string (Chinese or English) to internal field type.
   * Supports 21 field types.
   */
  private mapExcelTypeToFieldType(excelType: string): string {
    const map: Record<string, string> = {
      // Original 6 types
      text: 'text',
      '\u6587\u672C': 'text', // 文本
      number: 'number',
      '\u6570\u5B57': 'number', // 数字
      date: 'date',
      '\u65E5\u671F': 'date', // 日期
      select: 'select',
      '\u9009\u62E9': 'select', // 选择
      textarea: 'textarea',
      '\u591A\u884C\u6587\u672C': 'textarea', // 多行文本
      boolean: 'boolean',
      '\u5E03\u5C14': 'boolean', // 布尔
      // Extended input types
      email: 'email',
      '\u90AE\u7BB1': 'email', // 邮箱
      phone: 'phone',
      '\u7535\u8BDD': 'phone', // 电话
      url: 'url',
      '\u94FE\u63A5': 'url', // 链接
      time: 'time',
      '\u65F6\u95F4': 'time', // 时间
      datetime: 'datetime',
      '\u65E5\u671F\u65F6\u95F4': 'datetime', // 日期时间
      // Extended selection types
      radio: 'radio',
      '\u5355\u9009': 'radio', // 单选
      checkbox: 'checkbox',
      '\u591A\u9009': 'checkbox', // 多选
      switch: 'switch',
      '\u5F00\u5173': 'switch', // 开关
      slider: 'slider',
      '\u6ED1\u5757': 'slider', // 滑块
      rate: 'rate',
      '\u8BC4\u5206': 'rate', // 评分
      // Extended special types
      color: 'color',
      '\u989C\u8272': 'color', // 颜色
      file: 'file',
      '\u6587\u4EF6': 'file', // 文件
      image: 'image',
      '\u56FE\u7247': 'image', // 图片
      cascader: 'cascader',
      '\u7EA7\u8054': 'cascader', // 级联
      richtext: 'richtext',
      '\u5BCC\u6587\u672C': 'richtext', // 富文本
    };
    return map[excelType] || 'text';
  }

  /**
   * Export data to an Excel buffer.
   */
  async exportToExcel(
    data: Record<string, unknown>[],
    fields: ParsedField[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data');

    // Header row
    const headers = fields.map((f) => f.label);
    sheet.addRow(headers);

    // Data rows
    for (const row of data) {
      const values = fields.map((field) => row[field.name] ?? '');
      sheet.addRow(values);
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Validate Excel file format. Must have at least 3 header rows.
   */
  async validateFormat(
    buffer: Buffer,
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const sheet = workbook.getWorksheet(1);
      if (!sheet) {
        return { valid: false, error: 'Excel 文件没有工作表' };
      }

      const nameCell = sheet.getCell(1, 1);
      const labelCell = sheet.getCell(2, 1);
      const typeCell = sheet.getCell(3, 1);

      const hasThreeRows =
        this.getCellStringValue(nameCell) &&
        this.getCellStringValue(labelCell) &&
        this.getCellStringValue(typeCell);

      if (!hasThreeRows) {
        return {
          valid: false,
          error: 'Excel 文件格式不正确，需要至少 3 行字段定义',
        };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: '无法解析 Excel 文件' };
    }
  }

  /**
   * Extract string value from an exceljs cell, returning empty string for
   * null/undefined/empty cells.
   */
  private getCellStringValue(cell: ExcelJS.Cell): string {
    const val = cell.value;
    if (val === null || val === undefined) return '';
    return String(val).trim();
  }

  /**
   * Extract raw value from an exceljs cell (preserves numbers).
   */
  private getCellRawValue(cell: ExcelJS.Cell): unknown {
    return cell.value;
  }
}
