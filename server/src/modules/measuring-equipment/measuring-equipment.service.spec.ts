import { NotFoundException } from '@nestjs/common';
import { MeasuringEquipmentService } from './measuring-equipment.service';

describe('MeasuringEquipmentService', () => {
  const prisma = {
    measuringEquipment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    calibrationRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let service: MeasuringEquipmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MeasuringEquipmentService(prisma as any);
  });

  it('creates equipment for the current company', async () => {
    prisma.measuringEquipment.create.mockResolvedValue({ id: 'eq1' });

    await service.createEquipment({ name: '电子秤' } as any, 'company-2');

    expect(prisma.measuringEquipment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ company_id: 'company-2' }) }),
    );
  });

  it('lists only current company equipment', async () => {
    await service.findAllEquipment('company-2');

    expect(prisma.measuringEquipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ company_id: 'company-2' }) }),
    );
  });

  it('lists only current company overdue equipment', async () => {
    await service.findOverdue('company-2');

    expect(prisma.measuringEquipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ company_id: 'company-2' }) }),
    );
  });

  it('blocks calibration creation for equipment outside current company', async () => {
    prisma.measuringEquipment.findFirst.mockResolvedValue(null);

    await expect(service.createCalibration({
      measuring_equipment_id: 'eq-other',
      calibrated_at: '2026-05-01',
      valid_until: '2027-05-01',
      result: 'pass',
    } as any, 'company-2')).rejects.toThrow(NotFoundException);

    expect(prisma.calibrationRecord.create).not.toHaveBeenCalled();
  });

  it('creates calibration records for the current company', async () => {
    prisma.measuringEquipment.findFirst.mockResolvedValue({ id: 'eq1' });
    prisma.calibrationRecord.create.mockResolvedValue({ id: 'cal1' });
    prisma.measuringEquipment.update.mockResolvedValue({ id: 'eq1' });

    await service.createCalibration({
      measuring_equipment_id: 'eq1',
      calibrated_at: '2026-05-01',
      valid_until: '2027-05-01',
      result: 'pass',
    } as any, 'company-2');

    expect(prisma.calibrationRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ company_id: 'company-2' }) }),
    );
  });

  it('blocks calibration history lookup for equipment outside current company', async () => {
    prisma.measuringEquipment.findFirst.mockResolvedValue(null);

    await expect(service.findCalibrationsByEquipment('eq-other', 'company-2')).rejects.toThrow(NotFoundException);
    expect(prisma.calibrationRecord.findMany).not.toHaveBeenCalled();
  });
});
