import { Test } from '@nestjs/testing';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

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
});
