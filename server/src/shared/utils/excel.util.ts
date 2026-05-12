import * as ExcelJS from 'exceljs';

export interface FieldConfig {
  key: string;
  label: string;
  width?: number;
}

export function setupWorksheet(worksheet: ExcelJS.Worksheet, fields: FieldConfig[]) {
  worksheet.columns = fields.map((field) => ({
    header: field.label,
    key: field.key,
    width: field.width ?? 15,
  }));
  worksheet.getRow(1).font = { bold: true };
}

export function getFilteredFields(allFields: FieldConfig[], selected?: string[]): FieldConfig[] {
  if (!selected || selected.length === 0) return allFields;
  return allFields.filter((field) => selected.includes(field.key));
}

export function filterRow(row: Record<string, unknown>, fields: FieldConfig[]) {
  return fields.reduce<Record<string, unknown>>((acc, field) => {
    acc[field.key] = row[field.key] ?? '';
    return acc;
  }, {});
}

export function addDateRange(where: Record<string, any>, field: string, start?: string, end?: string) {
  if (!start && !end) return;
  where[field] = {};
  if (start) where[field].gte = new Date(start);
  if (end) where[field].lte = new Date(end);
}
