import { Test } from '@nestjs/testing';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('DocumentLifecycleService', () => {
  let service: DocumentLifecycleService;

  const mockPrisma = {
    document: {
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    documentReadConfirmation: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DocumentLifecycleService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(DocumentLifecycleService);
  });

  it('should throw NotFoundException when document not found', async () => {
    mockPrisma.document.findFirst.mockResolvedValue(null);
    await expect(service.publish('bad-id', {})).rejects.toThrow(NotFoundException);
  });

  it('should set status to effective on publish', async () => {
    mockPrisma.document.findFirst.mockResolvedValue({ id: 'd1', status: 'approved' });
    mockPrisma.document.update.mockResolvedValue({ id: 'd1', status: 'effective' });
    const result = await service.publish('d1', {});
    expect(result.status).toBe('effective');
    expect(mockPrisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'effective' }) }),
    );
  });

  it('should record read confirmation', async () => {
    mockPrisma.documentReadConfirmation.upsert.mockResolvedValue({ id: 'c1' });
    await service.confirmRead('doc1', 'user1');
    expect(mockPrisma.documentReadConfirmation.upsert).toHaveBeenCalled();
  });

  it('should return documents expiring within 30 days', async () => {
    mockPrisma.document.findMany.mockResolvedValue([{ id: 'd1', review_due_date: new Date() }]);
    const result = await service.getDueSoon(30);
    expect(result).toHaveLength(1);
  });

  it('should reject publishing when another effective version exists in same lineage', async () => {
    mockPrisma.document.findFirst.mockResolvedValue({
      id: 'd1',
      number: 'CX-01',
      status: 'approved',
      lineage_key: 'CX-01',
    });
    mockPrisma.document.count.mockResolvedValue(1);
    await expect(service.publish('d1', {})).rejects.toThrow(ConflictException);
  });

  it('should allow publishing when no other effective version exists in lineage', async () => {
    mockPrisma.document.findFirst.mockResolvedValue({
      id: 'd1',
      number: 'CX-01',
      status: 'approved',
      lineage_key: 'CX-01',
    });
    mockPrisma.document.count.mockResolvedValue(0);
    mockPrisma.document.update.mockResolvedValue({ id: 'd1', status: 'effective' });
    const result = await service.publish('d1', {});
    expect(result.status).toBe('effective');
  });

  it('supersede() should set status to superseded (not obsolete)', async () => {
    mockPrisma.document.update.mockResolvedValue({ id: 'old', status: 'superseded', superseded_by_id: 'new' });
    const result = await service.supersede('old', 'new');
    expect(result.status).toBe('superseded');
    expect(mockPrisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'old' },
        data: expect.objectContaining({ status: 'superseded', superseded_by_id: 'new' }),
      }),
    );
  });
});
