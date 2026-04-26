import { ConflictException, NotFoundException } from '@nestjs/common';
import { DocumentReadRequirementService } from './document-read-requirement.service';

describe('DocumentReadRequirementService', () => {
  const prisma = {
    document: { findUnique: jest.fn() },
    documentReadRequirement: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    documentReadConfirmation: { findMany: jest.fn() },
  };
  let service: DocumentReadRequirementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentReadRequirementService(prisma as any);
  });

  it('creates an active read requirement', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1' });
    prisma.documentReadRequirement.findFirst.mockResolvedValue(null);
    prisma.documentReadRequirement.create.mockResolvedValue({ id: 'req1' });
    const result = await service.create('doc1', { scopeType: 'user', scopeId: 'u1' }, 'admin');
    expect(result.id).toBe('req1');
  });

  it('rejects missing document', async () => {
    prisma.document.findUnique.mockResolvedValue(null);
    await expect(service.create('bad', { scopeType: 'user', scopeId: 'u1' }, 'admin')).rejects.toThrow(NotFoundException);
  });

  it('rejects duplicate active requirement', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1' });
    prisma.documentReadRequirement.findFirst.mockResolvedValue({ id: 'req1' });
    await expect(service.create('doc1', { scopeType: 'user', scopeId: 'u1' }, 'admin')).rejects.toThrow(ConflictException);
  });

  it('marks direct user confirmation as confirmed', async () => {
    prisma.documentReadRequirement.findMany.mockResolvedValue([{ id: 'req1', scopeType: 'user', scopeId: 'u1' }]);
    prisma.documentReadConfirmation.findMany.mockResolvedValue([{ user_id: 'u1' }]);
    const result = await service.getStatus('doc1');
    expect(result[0].confirmed).toBe(true);
  });
});
