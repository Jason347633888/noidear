import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EquipmentUsageService } from './equipment-usage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QualityNumberSequenceService } from '../quality-number-sequence/quality-number-sequence.service';

describe('EquipmentUsageService', () => {
  let service: EquipmentUsageService;
  let prisma: any;
  let numberSequence: any;

  const mockActiveEquipment = {
    id: 'eq-1',
    code: 'EQ-20260530-001',
    name: 'Test Equipment',
    status: 'active',
    deletedAt: null,
  };

  const mockScrappedEquipment = {
    id: 'eq-scrapped',
    code: 'EQ-20260530-002',
    name: 'Scrapped Equipment',
    status: 'scrapped',
    deletedAt: null,
  };

  const mockUsageRecord = {
    id: 'usage-1',
    company_id: 'company-1',
    equipmentId: 'eq-1',
    measuringEquipmentId: null,
    used_from: new Date('2026-05-30T08:00:00Z'),
    used_to: new Date('2026-05-30T12:00:00Z'),
    purpose: 'Production run #1',
    sample_reference: null,
    operatorId: 'user-1',
    equipment_status_after: 'normal',
    notes: null,
    created_at: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      equipment: {
        findUnique: jest.fn(),
      },
      equipmentUsageRecord: {
        create: jest.fn(),
      },
      nonConformance: {
        create: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    numberSequence = {
      generateNonConformanceNo: jest.fn().mockResolvedValue('NC-2026-0001'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentUsageService,
        { provide: PrismaService, useValue: prisma },
        { provide: QualityNumberSequenceService, useValue: numberSequence },
      ],
    }).compile();

    service = module.get<EquipmentUsageService>(EquipmentUsageService);
  });

  describe('createUsageRecord', () => {
    it('should create usage record for active equipment', async () => {
      prisma.equipment.findUnique.mockResolvedValue(mockActiveEquipment);
      prisma.equipmentUsageRecord.create.mockResolvedValue(mockUsageRecord);

      const result = await service.createUsageRecord({
        company_id: 'company-1',
        equipmentId: 'eq-1',
        used_from: '2026-05-30T08:00:00Z',
        used_to: '2026-05-30T12:00:00Z',
        purpose: 'Production run #1',
        operatorId: 'user-1',
        equipment_status_after: 'normal',
      });

      expect(result).toBeDefined();
      expect(prisma.equipmentUsageRecord.create).toHaveBeenCalled();
    });

    it('should reject usage record creation for scrapped equipment', async () => {
      prisma.equipment.findUnique.mockResolvedValue(mockScrappedEquipment);

      await expect(
        service.createUsageRecord({
          company_id: 'company-1',
          equipmentId: 'eq-scrapped',
          used_from: '2026-05-30T08:00:00Z',
          purpose: 'Test',
          equipment_status_after: 'normal',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when both equipmentId and measuringEquipmentId are provided', async () => {
      await expect(
        service.createUsageRecord({
          company_id: 'company-1',
          equipmentId: 'eq-1',
          measuringEquipmentId: 'me-1',
          used_from: '2026-05-30T08:00:00Z',
          purpose: 'Test',
          equipment_status_after: 'normal',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when neither equipmentId nor measuringEquipmentId is provided', async () => {
      await expect(
        service.createUsageRecord({
          company_id: 'company-1',
          used_from: '2026-05-30T08:00:00Z',
          purpose: 'Test',
          equipment_status_after: 'normal',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow usage record with measuringEquipmentId only', async () => {
      prisma.equipmentUsageRecord.create.mockResolvedValue({
        ...mockUsageRecord,
        equipmentId: null,
        measuringEquipmentId: 'me-1',
      });

      const result = await service.createUsageRecord({
        company_id: 'company-1',
        measuringEquipmentId: 'me-1',
        used_from: '2026-05-30T08:00:00Z',
        purpose: 'Calibration check',
        equipment_status_after: 'normal',
      });

      expect(result).toBeDefined();
      expect(prisma.equipment.findUnique).not.toHaveBeenCalled();
    });

    it('should create NonConformance when equipment_status_after is fault', async () => {
      prisma.equipment.findUnique.mockResolvedValue(mockActiveEquipment);
      prisma.equipmentUsageRecord.create.mockResolvedValue({
        ...mockUsageRecord,
        id: 'usage-fault',
        equipment_status_after: 'fault',
      });
      prisma.nonConformance.create.mockResolvedValue({ id: 'nc-1' });

      await service.createUsageRecord({
        company_id: 'company-1',
        equipmentId: 'eq-1',
        used_from: '2026-05-30T08:00:00Z',
        purpose: 'Test run',
        equipment_status_after: 'fault',
        operatorId: 'user-1',
      });

      expect(prisma.nonConformance.create).toHaveBeenCalled();
    });
  });
});
