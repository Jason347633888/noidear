import { Test } from '@nestjs/testing';
import { ShiftInstanceService } from './shift-instance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('ShiftInstanceService', () => {
  let service: ShiftInstanceService;

  const mockPrisma = {
    shiftInstance: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ShiftInstanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ShiftInstanceService);
  });

  describe('create', () => {
    it('should throw ConflictException when shift already exists', async () => {
      mockPrisma.shiftInstance.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create({ shift_type: '白班', shift_date: '2026-04-22' }, 'user1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should create shift when none exists', async () => {
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.shiftInstance.create.mockResolvedValue({ id: 'new-id', status: 'open' });
      const result = await service.create({ shift_type: '白班', shift_date: '2026-04-22' }, 'user1');
      expect(result.status).toBe('open');
      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ shift_type: '白班' }) }),
      );
    });
  });

  describe('close', () => {
    it('should throw BadRequestException when already closed', async () => {
      mockPrisma.shiftInstance.findFirst.mockResolvedValue({ id: 'id1', status: 'closed', production_runs: [] });
      await expect(service.close('id1', {}, 'user1')).rejects.toThrow(BadRequestException);
    });

    it('should close an open shift', async () => {
      mockPrisma.shiftInstance.findFirst.mockResolvedValue({
        id: 'id1', status: 'open', production_runs: [],
      });
      mockPrisma.shiftInstance.update.mockResolvedValue({ id: 'id1', status: 'closed' });
      const result = await service.close('id1', {}, 'user1');
      expect(result.status).toBe('closed');
    });
  });
});
