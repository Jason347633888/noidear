import { ConflictException, NotFoundException } from '@nestjs/common';
import { DocumentReadRequirementService } from './document-read-requirement.service';

describe('DocumentReadRequirementService', () => {
  const prisma = {
    document: { findUnique: jest.fn() },
    documentReadRequirement: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    documentReadConfirmation: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    department: { findUnique: jest.fn() },
    role: { findUnique: jest.fn() },
  };
  let service: DocumentReadRequirementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentReadRequirementService(prisma as any);
  });

  it('creates an active read requirement', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
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
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.documentReadRequirement.findFirst.mockResolvedValue({ id: 'req1' });
    await expect(service.create('doc1', { scopeType: 'user', scopeId: 'u1' }, 'admin')).rejects.toThrow(ConflictException);
  });

  describe('scope validation', () => {
    it('rejects a missing user scope target', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc1' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create('doc1', {
        scopeType: 'user',
        scopeId: 'missing-user',
      } as any, 'admin1')).rejects.toThrow('阅读范围用户不存在');
    });

    it('rejects a missing department scope target', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc1' });
      prisma.department.findUnique.mockResolvedValue(null);

      await expect(service.create('doc1', {
        scopeType: 'department',
        scopeId: 'missing-dep',
      } as any, 'admin1')).rejects.toThrow('阅读范围部门不存在');
    });

    it('rejects a missing role scope target', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc1' });
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.create('doc1', {
        scopeType: 'role',
        scopeId: 'missing-role',
      } as any, 'admin1')).rejects.toThrow('阅读范围角色不存在');
    });
  });

  it('marks direct user confirmation as confirmed', async () => {
    prisma.documentReadRequirement.findMany.mockResolvedValue([{ id: 'req1', scopeType: 'user', scopeId: 'u1' }]);
    prisma.documentReadConfirmation.findMany.mockResolvedValue([{ user_id: 'u1' }]);
    const result = await service.getStatus('doc1');
    expect(result[0].confirmed).toBe(true);
  });
});
