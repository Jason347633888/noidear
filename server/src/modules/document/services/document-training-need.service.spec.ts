import { BadRequestException, ConflictException } from '@nestjs/common';
import { DocumentTrainingNeedService } from './document-training-need.service';

describe('DocumentTrainingNeedService', () => {
  const prisma = {
    document: { findUnique: jest.fn() },
    documentTrainingNeed: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };
  let service: DocumentTrainingNeedService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentTrainingNeedService(prisma as any);
  });

  it('deduplicates suggestions by document and department', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1', title: 'SOP', status: 'effective', owner_department: '品质部' });
    prisma.documentTrainingNeed.findFirst.mockResolvedValue({ id: 'need1' });
    const result = await service.suggestForDocument('doc1', 'admin');
    expect(result.id).toBe('need1');
    expect(prisma.documentTrainingNeed.create).not.toHaveBeenCalled();
  });

  it('creates a new suggestion', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1', title: 'SOP', status: 'effective', owner_department: '品质部' });
    prisma.documentTrainingNeed.findFirst.mockResolvedValue(null);
    prisma.documentTrainingNeed.create.mockResolvedValue({ id: 'need1' });
    const result = await service.suggestForDocument('doc1', 'admin');
    expect(result.id).toBe('need1');
  });

  it('rejects accepting dismissed need', async () => {
    prisma.documentTrainingNeed.findUnique.mockResolvedValue({ id: 'need1', status: 'dismissed' });
    await expect(service.accept('need1')).rejects.toThrow(ConflictException);
  });

  it('requires reason when dismissing', async () => {
    await expect(service.dismiss('need1')).rejects.toThrow(BadRequestException);
  });
});
