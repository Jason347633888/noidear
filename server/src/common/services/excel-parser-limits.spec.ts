import { ExcelParserService } from './excel-parser.service';
import * as ExcelJS from 'exceljs';

/**
 * SEC-005: Excel parser resource limits tests.
 * Verifies that MAX_COLUMNS (100) and MAX_OPTION_ROWS (500) are enforced.
 */

/** Helper: build a 3-row header workbook with N text columns and optional data */
async function buildColumnBuffer(columnCount: number): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');

  const names = Array.from({ length: columnCount }, (_, i) => `field_${i}`);
  const labels = Array.from({ length: columnCount }, (_, i) => `Label ${i}`);
  const types = Array.from({ length: columnCount }, () => 'text');

  sheet.addRow(names);
  sheet.addRow(labels);
  sheet.addRow(types);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/** Helper: build a select-column workbook with N option rows */
async function buildOptionBuffer(optionCount: number): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');

  sheet.addRow(['status']);
  sheet.addRow(['Status']);
  sheet.addRow(['select']);

  for (let i = 0; i < optionCount; i++) {
    sheet.addRow([`option_${i}`]);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe('ExcelParserService - Resource Limits (SEC-005)', () => {
  let service: ExcelParserService;

  beforeEach(() => {
    service = new ExcelParserService();
  });

  describe('MAX_COLUMNS limit', () => {
    it('should reject Excel with 101 columns', async () => {
      const buffer = await buildColumnBuffer(101);
      await expect(service.parseToTemplateFields(buffer)).rejects.toThrow(/列数/);
    });

    it('should accept Excel with exactly 100 columns', async () => {
      const buffer = await buildColumnBuffer(100);
      const result = await service.parseToTemplateFields(buffer);
      expect(result.fields).toHaveLength(100);
    });

    it('should accept Excel with fewer than 100 columns', async () => {
      const buffer = await buildColumnBuffer(3);
      const result = await service.parseToTemplateFields(buffer);
      expect(result.fields).toHaveLength(3);
    });
  });

  describe('MAX_OPTION_ROWS limit', () => {
    it('should reject select field with 501 options', async () => {
      const buffer = await buildOptionBuffer(501);
      await expect(service.parseToTemplateFields(buffer)).rejects.toThrow(/选项/);
    });

    it('should accept select field with exactly 500 options', async () => {
      const buffer = await buildOptionBuffer(500);
      const result = await service.parseToTemplateFields(buffer);
      expect(result.fields[0].options).toHaveLength(500);
    });

    it('should accept select field with fewer than 500 options', async () => {
      const buffer = await buildOptionBuffer(2);
      const result = await service.parseToTemplateFields(buffer);
      expect(result.fields[0].options).toHaveLength(2);
    });
  });
});
