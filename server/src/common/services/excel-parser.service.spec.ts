import { ExcelParserService, ParsedField } from './excel-parser.service';
import * as ExcelJS from 'exceljs';

/**
 * Helper: Creates an Excel buffer using exceljs with the standard 3-row header format:
 *   Row 1: field names
 *   Row 2: field labels
 *   Row 3: field types
 *   Row 4+: data rows
 */
async function createTestExcelBuffer(
  columns: { name: string; label: string; type: string; data?: (string | number)[] }[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');

  // Row 1: names
  const nameRow = columns.map((c) => c.name);
  sheet.addRow(nameRow);

  // Row 2: labels
  const labelRow = columns.map((c) => c.label);
  sheet.addRow(labelRow);

  // Row 3: types
  const typeRow = columns.map((c) => c.type);
  sheet.addRow(typeRow);

  // Determine max data rows
  const maxDataRows = Math.max(...columns.map((c) => c.data?.length ?? 0), 0);
  for (let i = 0; i < maxDataRows; i++) {
    const row = columns.map((c) => (c.data && c.data[i] !== undefined ? c.data[i] : ''));
    sheet.addRow(row);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe('ExcelParserService (exceljs-based)', () => {
  let service: ExcelParserService;

  beforeEach(() => {
    service = new ExcelParserService();
  });

  // ==========================================================================
  // Basic Parsing
  // ==========================================================================
  describe('parseToTemplateFields', () => {
    it('should parse a basic 3-row header Excel file', async () => {
      const buffer = await createTestExcelBuffer([
        { name: 'product_name', label: '产品名称', type: '文本' },
        { name: 'batch_no', label: '批号', type: '文本' },
      ]);

      const result = await service.parseToTemplateFields(buffer);

      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].name).toBe('product_name');
      expect(result.fields[0].label).toBe('产品名称');
      expect(result.fields[0].type).toBe('text');
      expect(result.fields[1].name).toBe('batch_no');
    });

    it('should detect field types correctly from Chinese type names', async () => {
      const buffer = await createTestExcelBuffer([
        { name: 'f1', label: 'L1', type: '文本' },
        { name: 'f2', label: 'L2', type: '数字' },
        { name: 'f3', label: 'L3', type: '日期' },
        { name: 'f4', label: 'L4', type: '邮箱' },
        { name: 'f5', label: 'L5', type: '电话' },
      ]);

      const result = await service.parseToTemplateFields(buffer);

      expect(result.fields[0].type).toBe('text');
      expect(result.fields[1].type).toBe('number');
      expect(result.fields[2].type).toBe('date');
      expect(result.fields[3].type).toBe('email');
      expect(result.fields[4].type).toBe('phone');
    });

    it('should detect field types from English type names', async () => {
      const buffer = await createTestExcelBuffer([
        { name: 'f1', label: 'L1', type: 'text' },
        { name: 'f2', label: 'L2', type: 'number' },
        { name: 'f3', label: 'L3', type: 'textarea' },
        { name: 'f4', label: 'L4', type: 'boolean' },
        { name: 'f5', label: 'L5', type: 'radio' },
        { name: 'f6', label: 'L6', type: 'checkbox' },
      ]);

      const result = await service.parseToTemplateFields(buffer);

      expect(result.fields[0].type).toBe('text');
      expect(result.fields[1].type).toBe('number');
      expect(result.fields[2].type).toBe('textarea');
      expect(result.fields[3].type).toBe('boolean');
      expect(result.fields[4].type).toBe('radio');
      expect(result.fields[5].type).toBe('checkbox');
    });

    it('should default to text for unknown types', async () => {
      const buffer = await createTestExcelBuffer([
        { name: 'f1', label: 'L1', type: 'unknowntype' },
      ]);

      const result = await service.parseToTemplateFields(buffer);

      expect(result.fields[0].type).toBe('text');
    });

    it('should parse options for select type from data rows', async () => {
      const buffer = await createTestExcelBuffer([
        { name: 'status', label: '状态', type: '选择', data: ['合格', '不合格', '待检'] },
      ]);

      const result = await service.parseToTemplateFields(buffer);

      expect(result.fields[0].type).toBe('select');
      expect(result.fields[0].options).toBeDefined();
      expect(result.fields[0].options).toHaveLength(3);
      expect(result.fields[0].options![0]).toEqual({ label: '合格', value: '合格' });
      expect(result.fields[0].options![1]).toEqual({ label: '不合格', value: '不合格' });
      expect(result.fields[0].options![2]).toEqual({ label: '待检', value: '待检' });
    });

    it('should not parse options for text type', async () => {
      const buffer = await createTestExcelBuffer([
        { name: 'f1', label: 'L1', type: '文本', data: ['abc', 'def'] },
      ]);

      const result = await service.parseToTemplateFields(buffer);

      expect(result.fields[0].options).toBeUndefined();
    });

    it('should set required to true by default', async () => {
      const buffer = await createTestExcelBuffer([
        { name: 'f1', label: 'L1', type: 'text' },
      ]);

      const result = await service.parseToTemplateFields(buffer);

      expect(result.fields[0].required).toBe(true);
    });
  });

  // ==========================================================================
  // Preview Data
  // ==========================================================================
  describe('preview data parsing', () => {
    it('should parse preview data from row 4 onwards', async () => {
      const buffer = await createTestExcelBuffer([
        { name: 'name', label: '名称', type: 'text', data: ['ProductA', 'ProductB'] },
        { name: 'qty', label: '数量', type: 'number', data: [100, 200] },
      ]);

      const result = await service.parseToTemplateFields(buffer);

      expect(result.preview).toHaveLength(2);
      expect(result.preview[0]).toHaveProperty('field_0', 'ProductA');
      expect(result.preview[0]).toHaveProperty('field_1', 100);
    });

    it('should limit preview data to 10 rows', async () => {
      const data = Array.from({ length: 15 }, (_, i) => `item-${i}`);
      const buffer = await createTestExcelBuffer([
        { name: 'name', label: '名称', type: 'text', data },
      ]);

      const result = await service.parseToTemplateFields(buffer);

      expect(result.preview.length).toBe(10);
    });

    it('should handle empty data rows', async () => {
      const buffer = await createTestExcelBuffer([
        { name: 'f1', label: 'L1', type: 'text' },
      ]);

      const result = await service.parseToTemplateFields(buffer);

      expect(result.preview).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Export and Round-trip
  // ==========================================================================
  describe('exportToExcel', () => {
    it('should export data to a valid Excel buffer', async () => {
      const fields: ParsedField[] = [
        { name: 'product', label: '产品', type: 'text', required: true },
        { name: 'qty', label: '数量', type: 'number', required: true },
      ];
      const data = [
        { product: 'A', qty: 10 },
        { product: 'B', qty: 20 },
      ];

      const buffer = await service.exportToExcel(data, fields);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // Verify the buffer is valid by loading it
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const sheet = workbook.getWorksheet(1);
      expect(sheet).toBeDefined();
      expect(sheet!.getCell(1, 1).value).toBe('产品');
      expect(sheet!.getCell(1, 2).value).toBe('数量');
      expect(sheet!.getCell(2, 1).value).toBe('A');
    });

    it('should handle empty data array', async () => {
      const fields: ParsedField[] = [
        { name: 'f1', label: 'L1', type: 'text', required: true },
      ];

      const buffer = await service.exportToExcel([], fields);

      expect(buffer).toBeInstanceOf(Buffer);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const sheet = workbook.getWorksheet(1);
      expect(sheet!.rowCount).toBe(1); // Only header row
    });
  });

  // ==========================================================================
  // Validation
  // ==========================================================================
  describe('validateFormat', () => {
    it('should return valid for correct 3-row header format', async () => {
      const buffer = await createTestExcelBuffer([
        { name: 'f1', label: 'L1', type: 'text' },
      ]);

      const result = await service.validateFormat(buffer);

      expect(result.valid).toBe(true);
    });

    it('should return invalid for empty workbook', async () => {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await workbook.xlsx.writeBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await service.validateFormat(buffer);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('工作表');
    });

    it('should return invalid for file with missing header rows', async () => {
      // Only 1 row instead of 3
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sheet1');
      sheet.addRow(['name_only']);
      const arrayBuffer = await workbook.xlsx.writeBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await service.validateFormat(buffer);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('3 行');
    });

    it('should return invalid for corrupted buffer', async () => {
      const buffer = Buffer.from('not a valid excel file');

      const result = await service.validateFormat(buffer);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('解析');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('edge cases', () => {
    it('should handle columns with empty name cell (stop parsing)', async () => {
      // Manually create a workbook where column 2 has no name
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sheet1');
      sheet.addRow(['field1', '', 'field3']);
      sheet.addRow(['Label1', 'Label2', 'Label3']);
      sheet.addRow(['text', 'number', 'date']);
      const arrayBuffer = await workbook.xlsx.writeBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await service.parseToTemplateFields(buffer);

      // Should stop at empty name cell
      expect(result.fields.length).toBe(1);
      expect(result.fields[0].name).toBe('field1');
    });

    it('should handle all 21 field type mappings', async () => {
      const typeMap: Record<string, string> = {
        '文本': 'text', '数字': 'number', '日期': 'date',
        '选择': 'select', '多行文本': 'textarea', '布尔': 'boolean',
        '邮箱': 'email', '电话': 'phone', '链接': 'url',
        '时间': 'time', '日期时间': 'datetime', '单选': 'radio',
        '多选': 'checkbox', '开关': 'switch', '滑块': 'slider',
        '评分': 'rate', '颜色': 'color', '文件': 'file',
        '图片': 'image', '级联': 'cascader', '富文本': 'richtext',
      };

      const columns = Object.entries(typeMap).map(([chinese, english], i) => ({
        name: `f${i}`,
        label: `L${i}`,
        type: chinese,
      }));

      const buffer = await createTestExcelBuffer(columns);
      const result = await service.parseToTemplateFields(buffer);

      Object.entries(typeMap).forEach(([, expectedType], i) => {
        expect(result.fields[i].type).toBe(expectedType);
      });
    });

    it('CRITICAL-2: should parse options for radio, checkbox, cascader types', async () => {
      const buffer = await createTestExcelBuffer([
        { name: 'gender', label: '性别', type: '单选', data: ['男', '女'] },
        { name: 'hobbies', label: '爱好', type: '多选', data: ['阅读', '运动', '音乐'] },
        { name: 'region', label: '地区', type: '级联', data: ['北京', '上海', '广州'] },
        { name: 'status', label: '状态', type: '选择', data: ['合格', '不合格'] },
      ]);

      const result = await service.parseToTemplateFields(buffer);

      // radio
      expect(result.fields[0].type).toBe('radio');
      expect(result.fields[0].options).toBeDefined();
      expect(result.fields[0].options).toHaveLength(2);
      expect(result.fields[0].options![0]).toEqual({ label: '男', value: '男' });

      // checkbox
      expect(result.fields[1].type).toBe('checkbox');
      expect(result.fields[1].options).toBeDefined();
      expect(result.fields[1].options).toHaveLength(3);

      // cascader
      expect(result.fields[2].type).toBe('cascader');
      expect(result.fields[2].options).toBeDefined();
      expect(result.fields[2].options).toHaveLength(3);

      // select (should still work)
      expect(result.fields[3].type).toBe('select');
      expect(result.fields[3].options).toBeDefined();
      expect(result.fields[3].options).toHaveLength(2);
    });

    it('should throw BusinessException on invalid buffer for parseToTemplateFields', async () => {
      const invalidBuffer = Buffer.from('garbage data');

      await expect(service.parseToTemplateFields(invalidBuffer)).rejects.toThrow(
        'Excel 解析失败',
      );
    });
  });
});
