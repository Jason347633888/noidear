import { NotFoundException } from '@nestjs/common';
import { ChangeEventRelationService } from './change-event-relation.service';

describe('ChangeEventRelationService', () => {
  const prisma = {
    document: { findUnique: jest.fn() },
    recordTemplate: { findUnique: jest.fn() },
    product: { findUnique: jest.fn() },
    recipe: { findUnique: jest.fn() },
    processStep: { findUnique: jest.fn() },
    material: { findUnique: jest.fn() },
    supplier: { findUnique: jest.fn() },
    changeEventRelation: { createMany: jest.fn() },
  };

  beforeEach(() => jest.clearAllMocks());

  it('rejects missing known relation targets', async () => {
    prisma.document.findUnique.mockResolvedValue(null);
    const service = new ChangeEventRelationService(prisma as any);

    await expect(service.validateRelations([{
      targetType: 'document',
      targetId: 'missing-doc',
      targetLabel: '质量手册',
    }])).rejects.toThrow(NotFoundException);
  });

  it('creates validated relation rows', async () => {
    prisma.changeEventRelation.createMany.mockResolvedValue({ count: 1 });
    const service = new ChangeEventRelationService(prisma as any);

    await service.createRelations('change1', [{
      targetType: 'document',
      targetId: 'doc1',
      targetLabel: '质量手册',
      relationType: 'affected',
    }]);

    expect(prisma.changeEventRelation.createMany).toHaveBeenCalledWith({
      data: [{
        changeEventId: 'change1',
        targetType: 'document',
        targetId: 'doc1',
        targetRoute: null,
        targetLabel: '质量手册',
        relationType: 'affected',
        impactLevel: 'medium',
        requiredAction: null,
        status: 'open',
      }],
    });
  });
});
