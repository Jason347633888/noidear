import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentReferenceService } from './document-reference.service';

describe('DocumentReferenceService generic references', () => {
  const prisma = {
    document: { findUnique: jest.fn() },
    documentReference: { create: jest.fn(), findMany: jest.fn() },
  };
  let service: DocumentReferenceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentReferenceService(prisma as any);
  });

  it('creates a business module reference without targetDocId', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1', title: 'SOP' });
    prisma.documentReference.findMany.mockResolvedValue([]);
    prisma.documentReference.create.mockResolvedValue({ id: 'ref1', targetType: 'business_module' });

    const result = await service.createReference('doc1', {
      targetType: 'business_module',
      targetRoute: '/process',
      targetLabel: '研发流程',
      relationType: 'REQUIRES_RECORD',
    });

    expect(result.success).toBe(true);
    expect(prisma.documentReference.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        targetDocId: null,
        targetType: 'business_module',
        targetRoute: '/process',
        relationType: 'REQUIRES_RECORD',
      }),
    }));
  });

  it('rejects non-document references without targetId or route', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1' });
    await expect(service.createReference('doc1', {
      targetType: 'business_module',
      relationType: 'RELATED_TO',
    } as any)).rejects.toThrow(BadRequestException);
  });

  it('rejects document reference without targetDocId', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1', title: 'SOP' });
    await expect(service.createReference('doc1', {
      targetType: 'document',
      relationType: 'RELATED_TO',
    } as any)).rejects.toThrow(BadRequestException);
  });

  it('rejects self-reference for document type', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1', title: 'SOP' });
    await expect(service.createReference('doc1', {
      targetType: 'document',
      targetDocId: 'doc1',
      relationType: 'RELATED_TO',
    })).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when source document does not exist', async () => {
    prisma.document.findUnique.mockResolvedValue(null);
    await expect(service.createReference('missing', {
      targetType: 'business_module',
      targetRoute: '/process',
      relationType: 'RELATED_TO',
    })).rejects.toThrow(NotFoundException);
  });
});
