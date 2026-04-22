import { Test } from '@nestjs/testing';
import { VerificationRecordService } from './verification-record.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('VerificationRecordService', () => {
  let service: VerificationRecordService;

  const mockPrisma = {
    correctiveAction: { findFirst: jest.fn(), update: jest.fn() },
    verificationRecord: { create: jest.fn(), findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        VerificationRecordService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(VerificationRecordService);
  });

  it('should throw NotFoundException when CAPA not found', async () => {
    mockPrisma.correctiveAction.findFirst.mockResolvedValue(null);
    await expect(
      service.createVerification('bad-id', { verification_method: 'test', result: 'effective' }, 'u1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should close CAPA when verification is effective', async () => {
    mockPrisma.correctiveAction.findFirst.mockResolvedValue({ id: 'c1', company_id: '1', status: 'pending_verification' });
    mockPrisma.verificationRecord.create.mockResolvedValue({ id: 'v1', result: 'effective' });
    mockPrisma.correctiveAction.update.mockResolvedValue({ id: 'c1', status: 'closed' });

    await service.createVerification('c1', { verification_method: 'inspection', result: 'effective' }, 'u1');

    expect(mockPrisma.correctiveAction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'closed' }) }),
    );
  });

  it('should reopen CAPA when verification is ineffective', async () => {
    mockPrisma.correctiveAction.findFirst.mockResolvedValue({ id: 'c1', company_id: '1', status: 'pending_verification' });
    mockPrisma.verificationRecord.create.mockResolvedValue({ id: 'v1', result: 'ineffective' });
    mockPrisma.correctiveAction.update.mockResolvedValue({ id: 'c1', status: 'implementing' });

    await service.createVerification('c1', { verification_method: 'test', result: 'ineffective' }, 'u1');

    expect(mockPrisma.correctiveAction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'implementing' }) }),
    );
  });
});
