import { DocumentExpiryService } from './document-expiry.service';

describe('DocumentExpiryService', () => {
  const prisma = {
    businessDocumentLink: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    todoTask: {
      upsert: jest.fn(),
    },
  };
  let service: DocumentExpiryService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.businessDocumentLink.update.mockResolvedValue({});
    prisma.todoTask.upsert.mockResolvedValue({});
    service = new DocumentExpiryService(prisma as any);
  });

  it('marks expired and expiring links and creates renewal todos', async () => {
    prisma.businessDocumentLink.findMany.mockResolvedValue([
      {
        id: 'expired-link',
        businessType: 'supplier',
        businessId: 'supplier1',
        documentKind: 'business_license',
        expiresAt: new Date('2026-04-20'),
        warningDays: 30,
        status: 'valid',
        document: { id: 'doc1', number: 'DOC-001', title: '营业执照', creatorId: 'creator1', owner_user_id: null },
      },
      {
        id: 'soon-link',
        businessType: 'supplier',
        businessId: 'supplier2',
        documentKind: 'inspection_report',
        expiresAt: new Date('2026-05-10'),
        warningDays: 30,
        status: 'valid',
        document: { id: 'doc2', number: 'DOC-002', title: '外检报告', creatorId: 'creator2', owner_user_id: 'owner2' },
      },
      {
        id: 'valid-link',
        businessType: 'supplier',
        businessId: 'supplier3',
        documentKind: 'certificate',
        expiresAt: new Date('2026-08-01'),
        warningDays: 30,
        status: 'expiring_soon',
        document: { id: 'doc3', number: 'DOC-003', title: '证书', creatorId: 'creator3', owner_user_id: null },
      },
    ]);

    const result = await service.scanAndCreateTodos(new Date('2026-04-27T00:00:00Z'));

    expect(result).toEqual({ scanned: 3, expired: 1, expiringSoon: 1, valid: 1, todosUpserted: 2 });
    expect(prisma.businessDocumentLink.update).toHaveBeenCalledWith({
      where: { id: 'expired-link' },
      data: { status: 'expired' },
    });
    expect(prisma.businessDocumentLink.update).toHaveBeenCalledWith({
      where: { id: 'soon-link' },
      data: { status: 'expiring_soon' },
    });
    expect(prisma.businessDocumentLink.update).toHaveBeenCalledWith({
      where: { id: 'valid-link' },
      data: { status: 'valid' },
    });
    expect(prisma.todoTask.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId_type_relatedId: {
          userId: 'creator1',
          type: 'document_renewal',
          relatedId: 'expired-link',
        },
      },
      create: expect.objectContaining({
        userId: 'creator1',
        type: 'document_renewal',
        relatedId: 'expired-link',
        priority: 'high',
        dueDate: new Date('2026-04-20'),
      }),
    }));
    expect(prisma.todoTask.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId_type_relatedId: {
          userId: 'owner2',
          type: 'document_renewal',
          relatedId: 'soon-link',
        },
      },
      create: expect.objectContaining({
        userId: 'owner2',
        type: 'document_renewal',
        relatedId: 'soon-link',
        priority: 'normal',
        dueDate: new Date('2026-05-10'),
      }),
    }));
  });
});
