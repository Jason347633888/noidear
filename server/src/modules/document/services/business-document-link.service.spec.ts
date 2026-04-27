import { BusinessDocumentLinkService } from './business-document-link.service';

describe('BusinessDocumentLinkService', () => {
  const prisma = {
    businessDocumentLink: {
      upsert: jest.fn(),
    },
  };
  let service: BusinessDocumentLinkService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.businessDocumentLink.upsert.mockResolvedValue({ id: 'link1' });
    service = new BusinessDocumentLinkService(prisma as any);
  });

  it('links a supplier business license to a controlled document', async () => {
    const expiresAt = new Date('2027-01-01');

    await service.link({
      documentId: 'doc1',
      businessType: 'supplier',
      businessId: 'supplier1',
      documentKind: 'business_license',
      required: true,
      expiresAt,
    });

    expect(prisma.businessDocumentLink.upsert).toHaveBeenCalledWith({
      where: {
        businessType_businessId_documentKind_documentId: {
          businessType: 'supplier',
          businessId: 'supplier1',
          documentKind: 'business_license',
          documentId: 'doc1',
        },
      },
      create: expect.objectContaining({
        documentId: 'doc1',
        businessType: 'supplier',
        businessId: 'supplier1',
        documentKind: 'business_license',
        required: true,
        expiresAt,
      }),
      update: expect.objectContaining({
        required: true,
        expiresAt,
      }),
    });
  });
});
