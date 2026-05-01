import { Test } from '@nestjs/testing';
import { ShiftInstanceService } from './shift-instance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('ShiftInstanceService', () => {
  let service: ShiftInstanceService;

  const mockPrisma = {
    shiftType: {
      findFirst: jest.fn(),
    },
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
    const dayShiftType = {
      id: 'shift-day',
      code: 'DAY',
      name: '白班',
      start_time: '08:00',
      end_time: '20:00',
      crosses_day: false,
      active: true,
    };

    it('should throw ConflictException when shift already exists for shiftTypeId and date', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({ shiftTypeId: 'shift-day', shift_date: '2026-04-22' }, 'user1'),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.shiftInstance.findUnique).toHaveBeenCalledWith({
        where: {
          company_id_shift_type_id_shift_date: {
            company_id: '1',
            shift_type_id: 'shift-day',
            shift_date: new Date('2026-04-22'),
          },
        },
      });
    });

    it('should create shift from shiftTypeId and persist the legacy name snapshot', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.shiftInstance.create.mockResolvedValue({
        id: 'new-id',
        status: 'open',
        shift_type_id: 'shift-day',
        shift_type: '白班',
      });

      const result = await service.create(
        { shiftTypeId: 'shift-day', shift_date: '2026-04-22' },
        'user1',
      );

      expect(result.status).toBe('open');
      expect(mockPrisma.shiftType.findFirst).toHaveBeenCalledWith({
        where: { id: 'shift-day', active: true },
      });
      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith({
        data: {
          company_id: '1',
          shift_type_id: 'shift-day',
          shift_type: '白班',
          shift_date: new Date('2026-04-22'),
          opened_by: 'user1',
          notes: undefined,
        },
        include: { shift_type_ref: true },
      });
    });

    it('should keep legacy shift_type payload working during migration window', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.shiftInstance.create.mockResolvedValue({
        id: 'new-id',
        status: 'open',
        shift_type_id: 'shift-day',
        shift_type: '白班',
      });

      await service.create({ shift_type: '白班', shift_date: '2026-04-22' }, 'user1');

      expect(mockPrisma.shiftType.findFirst).toHaveBeenCalledWith({
        where: { name: '白班', active: true },
      });
      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shift_type_id: 'shift-day',
            shift_type: '白班',
          }),
        }),
      );
    });

    it('should reject unknown legacy shift_type values', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ shift_type: '中班', shift_date: '2026-04-22' }, 'user1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.shiftInstance.create).not.toHaveBeenCalled();
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
