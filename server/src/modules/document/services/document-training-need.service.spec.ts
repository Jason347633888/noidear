import { BadRequestException, ConflictException } from '@nestjs/common';
import { DocumentTrainingNeedService } from './document-training-need.service';

describe('DocumentTrainingNeedService', () => {
  const prisma = {
    document: { findUnique: jest.fn() },
    documentTrainingNeed: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    trainingProject: { findUnique: jest.fn() },
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

  it('treats legacy approved document as revised-document trigger', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1', title: 'SOP', status: 'approved', owner_department: '品质部' });
    prisma.documentTrainingNeed.findFirst.mockResolvedValue(null);
    prisma.documentTrainingNeed.create.mockResolvedValue({ id: 'need1' });

    await service.suggestForDocument('doc1', 'admin');

    expect(prisma.documentTrainingNeed.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        triggerType: 'revised_document',
      }),
    });
  });

  it('rejects accepting dismissed need', async () => {
    prisma.documentTrainingNeed.findUnique.mockResolvedValue({ id: 'need1', status: 'dismissed' });
    await expect(service.accept('need1')).rejects.toThrow(ConflictException);
  });

  it('requires reason when dismissing', async () => {
    await expect(service.dismiss('need1')).rejects.toThrow(BadRequestException);
  });

  describe('link', () => {
    it('rejects a missing linkedTrainingProjectId', async () => {
      prisma.documentTrainingNeed.findUnique.mockResolvedValue({ id: 'need1', status: 'accepted' });
      prisma.trainingProject.findUnique.mockResolvedValue(null);

      await expect(service.link('need1', 'missing-project')).rejects.toThrow('培训项目不存在');
    });

    it('links to an existing training project and updates status', async () => {
      prisma.documentTrainingNeed.findUnique.mockResolvedValue({ id: 'need1', status: 'accepted' });
      prisma.trainingProject.findUnique.mockResolvedValue({ id: 'project1', title: '换版培训', status: 'planned' });
      prisma.documentTrainingNeed.update.mockResolvedValue({
        id: 'need1',
        status: 'linked',
        linkedTrainingProjectId: 'project1',
      });

      await service.link('need1', 'project1');

      expect(prisma.documentTrainingNeed.update).toHaveBeenCalledWith({
        where: { id: 'need1' },
        data: { status: 'linked', linkedTrainingProjectId: 'project1' },
      });
    });

    it('rejects linking a dismissed training need', async () => {
      prisma.documentTrainingNeed.findUnique.mockResolvedValue({ id: 'need1', status: 'dismissed' });

      await expect(service.link('need1', 'project1')).rejects.toThrow(ConflictException);
    });
  });
});
