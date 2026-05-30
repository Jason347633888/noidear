import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EquipmentAcceptanceService } from './equipment-acceptance.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('EquipmentAcceptanceService', () => {
  let service: EquipmentAcceptanceService;
  let prisma: any;

  const mockEquipment = {
    id: 'eq-1',
    code: 'EQ-20260530-001',
    name: 'Test Equipment',
    category: 'production',
    status: 'inactive',
    activationDate: null,
    deletedAt: null,
  };

  const mockAcceptanceRecord = {
    id: 'acc-1',
    company_id: 'company-1',
    equipmentId: 'eq-1',
    accepted_at: new Date('2026-05-30T10:00:00Z'),
    accepted_by: 'user-1',
    result: 'pass',
    checklist_snapshot: null,
    evidence_file_id: null,
    approvalInstanceId: null,
    created_at: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      equipment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      equipmentAcceptanceRecord: {
        create: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentAcceptanceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<EquipmentAcceptanceService>(EquipmentAcceptanceService);
  });

  describe('createAcceptanceRecord', () => {
    it('should set equipment status to active when result is pass', async () => {
      prisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      prisma.equipmentAcceptanceRecord.create.mockResolvedValue(mockAcceptanceRecord);
      prisma.equipment.update.mockResolvedValue({ ...mockEquipment, status: 'active', activationDate: new Date('2026-05-30T10:00:00Z') });

      await service.createAcceptanceRecord({
        company_id: 'company-1',
        equipmentId: 'eq-1',
        accepted_at: '2026-05-30T10:00:00Z',
        accepted_by: 'user-1',
        result: 'pass',
      });

      expect(prisma.equipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'eq-1' },
          data: expect.objectContaining({ status: 'active' }),
        }),
      );
    });

    it('should not change equipment status when result is fail', async () => {
      prisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      prisma.equipmentAcceptanceRecord.create.mockResolvedValue({ ...mockAcceptanceRecord, result: 'fail' });

      await service.createAcceptanceRecord({
        company_id: 'company-1',
        equipmentId: 'eq-1',
        accepted_at: '2026-05-30T10:00:00Z',
        accepted_by: 'user-1',
        result: 'fail',
      });

      expect(prisma.equipment.update).not.toHaveBeenCalled();
    });

    it('should not override activationDate when equipment is already active', async () => {
      const alreadyActiveEquipment = {
        ...mockEquipment,
        status: 'active',
        activationDate: new Date('2026-01-01'),
      };
      prisma.equipment.findUnique.mockResolvedValue(alreadyActiveEquipment);
      prisma.equipmentAcceptanceRecord.create.mockResolvedValue(mockAcceptanceRecord);
      prisma.equipment.update.mockResolvedValue(alreadyActiveEquipment);

      await service.createAcceptanceRecord({
        company_id: 'company-1',
        equipmentId: 'eq-1',
        accepted_at: '2026-05-30T10:00:00Z',
        accepted_by: 'user-1',
        result: 'pass',
      });

      // Should still set status, but activationDate should remain the existing one
      const updateCall = prisma.equipment.update.mock.calls[0][0];
      expect(updateCall.data.activationDate).toBeUndefined();
    });

    it('should throw NotFoundException when equipment not found', async () => {
      prisma.equipment.findUnique.mockResolvedValue(null);

      await expect(
        service.createAcceptanceRecord({
          company_id: 'company-1',
          equipmentId: 'non-existent',
          accepted_at: '2026-05-30T10:00:00Z',
          result: 'pass',
        }),
      ).rejects.toThrow();
    });
  });
});
