import * as ExcelJS from 'exceljs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const JSZip = require('jszip');
import { ForbiddenException } from '@nestjs/common';
import { RecordExportService } from './record-export.service';
import { AuditService } from '../audit/audit.service';

const record = (overrides: any = {}) => ({
  id: overrides.id ?? 'rec-1',
  number: overrides.number ?? 'R-001',
  templateId: overrides.templateId ?? 'tpl-clean',
  status: overrides.status ?? 'submitted',
  dataJson: overrides.dataJson ?? { temperature: 12 },
  createdAt: new Date('2026-05-14T08:00:00.000Z'),
  submittedAt: new Date('2026-05-14T09:00:00.000Z'),
  creator: { id: 'u1', name: '张三', username: 'zhangsan' },
  template: overrides.template ?? {
    id: overrides.templateId ?? 'tpl-clean',
    name: overrides.templateName ?? '清洁记录',
    fieldsJson: {
      fields: [{ name: 'temperature', label: '温度', type: 'number' }],
    },
  },
  ...overrides,
});

const mockAuditService = () => ({
  createSensitiveLog: jest.fn().mockResolvedValue({}),
} as unknown as AuditService);

const serviceWithRecords = (records: any[], count = records.length, auditService?: AuditService) =>
  new RecordExportService(
    {
      record: {
        count: jest.fn().mockResolvedValue(count),
        findMany: jest.fn().mockResolvedValue(records),
      },
    } as any,
    auditService ?? mockAuditService(),
  );

describe('RecordExportService', () => {
  it('exports one template as xlsx with dynamic field columns', async () => {
    const service = serviceWithRecords([record()]);
    const result = await service.exportRecords({ templateId: 'tpl-clean' });

    expect(result.contentType).toContain('spreadsheetml');
    expect(result.filename).toContain('清洁记录');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.buffer as any);
    const worksheet = workbook.getWorksheet('记录填写结果')!;
    expect(worksheet.getRow(1).values).toContain('温度');
    // 数值字段经 formatFieldValue 转换为字符串输出
    const row2 = (worksheet.getRow(2).values as unknown[]).map(String);
    expect(row2).toContain('12');
  });

  it('exports multiple templates as zip with one xlsx per template', async () => {
    const service = serviceWithRecords([
      record({ templateId: 'tpl-clean', templateName: '清洁记录' }),
      record({
        id: 'rec-2',
        number: 'R-002',
        templateId: 'tpl-glass',
        templateName: '玻璃硬塑检查',
        dataJson: { result: '合格' },
        template: {
          id: 'tpl-glass',
          name: '玻璃硬塑检查',
          fieldsJson: { fields: [{ name: 'result', label: '结果', type: 'text' }] },
        },
      }),
    ]);

    const result = await service.exportRecords({});
    expect(result.contentType).toBe('application/zip');

    const zip = await JSZip.loadAsync(result.buffer);
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining(['清洁记录-tpl-clean.xlsx', '玻璃硬塑检查-tpl-glass.xlsx']),
    );
  });

  it('rejects synchronous exports above 10000 records', async () => {
    const service = serviceWithRecords([], 10001);
    await expect(service.exportRecords({})).rejects.toThrow('最多支持 10000 条');
  });

  it('excludes drafts by default and allows explicit draft export', async () => {
    const service = serviceWithRecords([record()]);
    await service.exportRecords({});
    expect((service as any).prisma.record.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ status: { in: ['submitted', 'signed', 'approved', 'rejected'] } }),
    });

    await service.exportRecords({ status: 'draft' });
    expect((service as any).prisma.record.count).toHaveBeenLastCalledWith({
      where: expect.objectContaining({ status: 'draft' }),
    });
  });

  it('renders attachment, signature, and richtext fields as readable cell values', async () => {
    const service = serviceWithRecords([record({
      dataJson: {
        attachment: { name: '现场照片.jpg', url: '/uploads/photo.jpg' },
        sign: 'data:image/png;base64,abc',
        notes: '<p>复核<strong>通过</strong></p>',
      },
      template: {
        id: 'tpl-clean',
        name: '清洁记录',
        fieldsJson: {
          fields: [
            { name: 'attachment', label: '附件', type: 'image' },
            { name: 'sign', label: '签名', type: 'signature' },
            { name: 'notes', label: '备注', type: 'richtext' },
          ],
        },
      },
    })]);

    const result = await service.exportRecords({});
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.buffer as any);
    const rowValues = (workbook.getWorksheet('记录填写结果')!.getRow(2).values as unknown[]).join(' ');
    expect(rowValues).toContain('现场照片.jpg /uploads/photo.jpg');
    expect(rowValues).toContain('已签名');
    expect(rowValues).toContain('复核 通过');
    expect(rowValues).not.toContain('data:image/png');
  });

  describe('user scoping by role', () => {
    it('admin gets all records without createdBy filter', async () => {
      const service = serviceWithRecords([record()]);
      await service.exportRecords({}, { id: 'admin-1', roleCode: 'admin' });
      expect((service as any).prisma.record.count).toHaveBeenCalledWith({
        where: expect.not.objectContaining({ createdBy: expect.anything() }),
      });
    });

    it('leader gets all records without createdBy filter', async () => {
      const service = serviceWithRecords([record()]);
      await service.exportRecords({}, { id: 'leader-1', roleCode: 'leader' });
      expect((service as any).prisma.record.count).toHaveBeenCalledWith({
        where: expect.not.objectContaining({ createdBy: expect.anything() }),
      });
    });

    it('regular user only gets their own records via createdBy filter', async () => {
      const service = serviceWithRecords([record()]);
      await service.exportRecords({}, { id: 'user-1', roleCode: 'user' });
      expect((service as any).prisma.record.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ createdBy: 'user-1' }),
      });
    });

    it('user passes another user submitterId → ForbiddenException', async () => {
      const service = serviceWithRecords([record()]);
      await expect(
        service.exportRecords({ submitterId: 'other-user-id' }, { id: 'user-1', roleCode: 'user' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('user passes their own submitterId → exports normally', async () => {
      const service = serviceWithRecords([record()]);
      await expect(
        service.exportRecords({ submitterId: 'user-1' }, { id: 'user-1', roleCode: 'user' }),
      ).resolves.toBeDefined();
      expect((service as any).prisma.record.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ createdBy: 'user-1' }),
      });
    });

    it('admin passes another user submitterId → exports normally (no ForbiddenException)', async () => {
      const service = serviceWithRecords([record()]);
      await expect(
        service.exportRecords({ submitterId: 'other-user-id' }, { id: 'admin-1', roleCode: 'admin' }),
      ).resolves.toBeDefined();
      expect((service as any).prisma.record.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ createdBy: 'other-user-id' }),
      });
    });
  });

  it('uses unique entry names when two templates share the same display name', async () => {
    const service = serviceWithRecords([
      record({ templateId: 'tpl-a', templateName: '清洁记录' }),
      record({
        id: 'rec-2',
        number: 'R-002',
        templateId: 'tpl-b',
        templateName: '清洁记录',
        template: {
          id: 'tpl-b',
          name: '清洁记录',
          fieldsJson: { fields: [{ name: 'temperature', label: '温度', type: 'number' }] },
        },
      }),
    ]);
    const result = await service.exportRecords({});
    const zip = await JSZip.loadAsync(result.buffer);
    // 两个模板同名但 templateId 不同，zip 条目应各自独立
    expect(Object.keys(zip.files)).toHaveLength(2);
    expect(Object.keys(zip.files)).toContain('清洁记录-tpl-a.xlsx');
    expect(Object.keys(zip.files)).toContain('清洁记录-tpl-b.xlsx');
  });

  it('uses creator.name with fallback to username for 填写人 column', async () => {
    const serviceNameOnly = serviceWithRecords([record({ creator: { id: 'u1', name: '张三', username: 'zhangsan' } })]);
    const result1 = await serviceNameOnly.exportRecords({});
    const wb1 = new ExcelJS.Workbook();
    await wb1.xlsx.load(result1.buffer as any);
    const row1Values = (wb1.getWorksheet('记录填写结果')!.getRow(2).values as unknown[]).join(' ');
    expect(row1Values).toContain('张三');

    const serviceUsernameOnly = serviceWithRecords([record({ creator: { id: 'u2', name: null, username: 'lisi' } })]);
    const result2 = await serviceUsernameOnly.exportRecords({});
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(result2.buffer as any);
    const row2Values = (wb2.getWorksheet('记录填写结果')!.getRow(2).values as unknown[]).join(' ');
    expect(row2Values).toContain('lisi');
  });

  describe('audit log written in service layer', () => {
    const user = { id: 'admin-1', username: 'admin', roleCode: 'admin' };

    it('single template: audit resourceId = templateId, resourceName = template name, exportedCount correct', async () => {
      const audit = mockAuditService();
      const service = serviceWithRecords([record()], 1, audit);
      await service.exportRecords({ templateId: 'tpl-clean' }, user);
      expect(audit.createSensitiveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'export_data',
          resourceType: 'record',
          resourceId: 'tpl-clean',
          resourceName: '清洁记录',
          userId: 'admin-1',
          details: expect.objectContaining({ exportedCount: 1 }),
        }),
      );
    });

    it('cross-template: audit resourceId = "cross-template", resourceName = "多模板记录导出"', async () => {
      const audit = mockAuditService();
      const records = [
        record({ templateId: 'tpl-clean', templateName: '清洁记录' }),
        record({
          id: 'rec-2',
          number: 'R-002',
          templateId: 'tpl-glass',
          templateName: '玻璃硬塑检查',
          dataJson: { result: '合格' },
          template: {
            id: 'tpl-glass',
            name: '玻璃硬塑检查',
            fieldsJson: { fields: [{ name: 'result', label: '结果', type: 'text' }] },
          },
        }),
      ];
      const service = serviceWithRecords(records, 2, audit);
      await service.exportRecords({}, user);
      expect(audit.createSensitiveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'export_data',
          resourceType: 'record',
          resourceId: 'cross-template',
          resourceName: '多模板记录导出',
          userId: 'admin-1',
          details: expect.objectContaining({ exportedCount: 2 }),
        }),
      );
    });

    it('exportedCount matches actual records returned', async () => {
      const audit = mockAuditService();
      const records = [record(), record({ id: 'rec-2', number: 'R-002' }), record({ id: 'rec-3', number: 'R-003' })];
      const service = serviceWithRecords(records, 3, audit);
      await service.exportRecords({ templateId: 'tpl-clean' }, user);
      expect(audit.createSensitiveLog).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({ exportedCount: 3 }),
        }),
      );
    });
  });
});
