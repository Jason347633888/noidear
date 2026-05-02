import { BadRequestException } from '@nestjs/common';
import { DocumentIssuanceService } from './document-issuance.service';

describe('DocumentIssuanceService', () => {
  function createPrismaMock(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      document: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'doc-1',
          title: '文件发放控制程序',
          doc_code: 'GRSS-CX-01',
          number: 'CX-001',
        }),
      },
      documentIssuance: {
        create: jest.fn().mockResolvedValue({ id: 'di-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({ id: 'di-1', deleted_at: expect.any(Date) }),
      },
      ...overrides,
    } as any;
  }

  it('rejects creation when document_id is missing', async () => {
    const prisma = createPrismaMock();
    const service = new DocumentIssuanceService(prisma);

    await expect(
      service.create({
        document_name: '用户手填文件',
        quantity: 1,
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.document.findFirst).not.toHaveBeenCalled();
    expect(prisma.documentIssuance.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the selected document does not exist', async () => {
    const prisma = createPrismaMock({
      document: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new DocumentIssuanceService(prisma);

    await expect(
      service.create({
        document_id: 'missing-doc',
        quantity: 1,
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.document.findFirst).toHaveBeenCalledWith({
      where: { id: 'missing-doc', deletedAt: null },
      select: { id: true, title: true, doc_code: true, number: true },
    });
    expect(prisma.documentIssuance.create).not.toHaveBeenCalled();
  });

  it('creates an issuance linked to a controlled document and writes snapshots from Document', async () => {
    const prisma = createPrismaMock();
    const service = new DocumentIssuanceService(prisma);

    await service.create({
      document_id: 'doc-1',
      document_name: '用户手填名称应被忽略',
      document_code: 'USER-CODE',
      issued_to: '张三',
      issued_by: '李四',
      quantity: 2,
      purpose: '岗位使用',
      issued_at: '2026-05-02T10:30:00',
      notes: '纸质版',
    } as any);

    expect(prisma.documentIssuance.create).toHaveBeenCalledWith({
      data: {
        document_id: 'doc-1',
        document_name: '文件发放控制程序',
        document_code: 'GRSS-CX-01',
        issued_to: '张三',
        issued_by: '李四',
        quantity: 2,
        purpose: '岗位使用',
        issued_at: new Date('2026-05-02T10:30:00'),
        notes: '纸质版',
        company_id: '1',
      },
    });
  });
});
