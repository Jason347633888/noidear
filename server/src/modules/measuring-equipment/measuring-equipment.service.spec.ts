import { NotFoundException } from '@nestjs/common';
import { MeasuringEquipmentService } from './measuring-equipment.service';

describe('MeasuringEquipmentService', () => {
  const ncServiceMock = {
    createFromCalibrationReading: jest.fn(),
  };

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
    calibrationPointReading: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: MeasuringEquipmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MeasuringEquipmentService(prisma as any, ncServiceMock as any);
  });

  it('creates equipment for the current company', async () => {
    prisma.measuringEquipment.create.mockResolvedValue({ id: 'eq1' });

    await service.createEquipment({ name: '电子秤' } as any, 'company-2');

    expect(prisma.measuringEquipment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ company_id: 'company-2' }) }),
    );
  });

  it('lists only current company equipment', async () => {
    prisma.measuringEquipment.findMany.mockResolvedValue([]);

    await service.findAllEquipment('company-2');

    expect(prisma.measuringEquipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ company_id: 'company-2' }) }),
    );
  });

  it('lists only current company overdue equipment', async () => {
    prisma.measuringEquipment.findMany.mockResolvedValue([]);

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
    prisma.measuringEquipment.findFirst.mockResolvedValue({ id: 'eq1', calibration_cycle_days: 365 });
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

  // ── New capability tests ──────────────────────────────────────────

  it('stores measurementType, rangeMin, rangeMax, unit, accuracy when creating equipment', async () => {
    prisma.measuringEquipment.create.mockResolvedValue({ id: 'eq2' });

    await service.createEquipment({
      code: 'ME-001',
      name: '游标卡尺',
      measurement_type: 'length',
      range_min: 0,
      range_max: 150,
      unit: 'mm',
      accuracy: '0.02mm',
    } as any, 'company-1');

    expect(prisma.measuringEquipment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          measurement_type: 'length',
          range_min: 0,
          range_max: 150,
          unit: 'mm',
          accuracy: '0.02mm',
        }),
      }),
    );
  });

  it('sets status to normal and updates dates when calibration result is pass', async () => {
    prisma.measuringEquipment.findFirst.mockResolvedValue({ id: 'eq1', calibration_cycle_days: 365 });
    prisma.calibrationRecord.create.mockResolvedValue({ id: 'cal1' });
    prisma.measuringEquipment.update.mockResolvedValue({ id: 'eq1', status: 'normal' });

    await service.createCalibration({
      measuring_equipment_id: 'eq1',
      calibrated_at: '2026-05-01',
      valid_until: '2027-05-01',
      result: 'pass',
    } as any, 'company-1');

    expect(prisma.measuringEquipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          last_calibrated_at: new Date('2026-05-01'),
          next_calibration_at: new Date('2027-05-01'),
          status: 'normal',
        }),
      }),
    );
  });

  it('sets status to normal and updates dates when calibration result is conditional', async () => {
    prisma.measuringEquipment.findFirst.mockResolvedValue({ id: 'eq1', calibration_cycle_days: 180 });
    prisma.calibrationRecord.create.mockResolvedValue({ id: 'cal2' });
    prisma.measuringEquipment.update.mockResolvedValue({ id: 'eq1', status: 'normal' });

    await service.createCalibration({
      measuring_equipment_id: 'eq1',
      calibrated_at: '2026-05-01',
      valid_until: '2026-11-01',
      result: 'conditional',
    } as any, 'company-1');

    expect(prisma.measuringEquipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          last_calibrated_at: new Date('2026-05-01'),
          next_calibration_at: new Date('2026-11-01'),
          status: 'normal',
        }),
      }),
    );
  });

  it('sets status to failed when calibration result is fail', async () => {
    prisma.measuringEquipment.findFirst.mockResolvedValue({ id: 'eq1', calibration_cycle_days: 365 });
    prisma.calibrationRecord.create.mockResolvedValue({ id: 'cal3' });
    prisma.measuringEquipment.update.mockResolvedValue({ id: 'eq1', status: 'failed' });

    await service.createCalibration({
      measuring_equipment_id: 'eq1',
      calibrated_at: '2026-05-01',
      valid_until: '2027-05-01',
      result: 'fail',
    } as any, 'company-1');

    expect(prisma.measuringEquipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
        }),
      }),
    );
  });

  it('getOverdueStatus returns true when next_calibration_at is in the past and status is normal', () => {
    const pastDate = new Date('2020-01-01');
    const equipment = { next_calibration_at: pastDate, status: 'normal' };

    expect(service.getOverdueStatus(equipment as any)).toBe(true);
  });

  it('getOverdueStatus returns false when next_calibration_at is in the future', () => {
    const futureDate = new Date('2099-01-01');
    const equipment = { next_calibration_at: futureDate, status: 'normal' };

    expect(service.getOverdueStatus(equipment as any)).toBe(false);
  });

  it('getOverdueStatus returns false when status is failed (not overdue logic)', () => {
    const pastDate = new Date('2020-01-01');
    const equipment = { next_calibration_at: pastDate, status: 'failed' };

    expect(service.getOverdueStatus(equipment as any)).toBe(false);
  });

  it('getOverdueStatus returns false when next_calibration_at is null', () => {
    const equipment = { next_calibration_at: null, status: 'normal' };

    expect(service.getOverdueStatus(equipment as any)).toBe(false);
  });

  it('findAllEquipment result includes isOverdue field', async () => {
    const pastDate = new Date('2020-01-01');
    const futureDate = new Date('2099-01-01');
    prisma.measuringEquipment.findMany.mockResolvedValue([
      { id: 'eq1', status: 'normal', next_calibration_at: pastDate, calibration_records: [] },
      { id: 'eq2', status: 'normal', next_calibration_at: futureDate, calibration_records: [] },
    ]);

    const result = await service.findAllEquipment('company-1');

    expect(result[0]).toHaveProperty('isOverdue', true);
    expect(result[1]).toHaveProperty('isOverdue', false);
  });

  // ── Phase 11 Task 4: CalibrationPointReading tests ────────────────────────

  describe('createCalibrationRecordWithReadings', () => {
    const baseDto = {
      measuring_equipment_id: 'eq1',
      calibrated_at: '2026-05-01',
      valid_until: '2027-05-01',
      calibration_body: '计量院',
      certificate_no: 'CERT-001',
      notes: null,
    };

    const passReadings = [
      { position: 'P1', standard_value: 100, measured_value: 100.01, tolerance: 0.1, judgment: 'pass' },
      { position: 'P2', standard_value: 200, measured_value: 199.98, tolerance: 0.1, judgment: 'pass' },
    ];

    const failReadings = [
      { position: 'P1', standard_value: 100, measured_value: 100.01, tolerance: 0.1, judgment: 'pass' },
      { position: 'P2', standard_value: 200, measured_value: 201.5, tolerance: 0.1, judgment: 'fail' },
    ];

    it('sets result to pass when all readings pass', async () => {
      prisma.measuringEquipment.findFirst.mockResolvedValue({ id: 'eq1', company_id: 'company-1' });
      const createdRecord = { id: 'cal1', result: 'pass' };
      const mockCreate = jest.fn()
        .mockResolvedValueOnce({ id: 'r1' })
        .mockResolvedValueOnce({ id: 'r2' });
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn({
          calibrationRecord: { create: jest.fn().mockResolvedValue(createdRecord) },
          calibrationPointReading: { create: mockCreate },
          measuringEquipment: { update: jest.fn().mockResolvedValue({}) },
        }),
      );

      const result = await service.createCalibrationRecordWithReadings(
        { ...baseDto, readings: passReadings },
        'company-1',
      );

      expect(result.result).toBe('pass');
    });

    it('sets result to fail when any reading has judgment fail', async () => {
      prisma.measuringEquipment.findFirst.mockResolvedValue({ id: 'eq1', company_id: 'company-1' });
      const createdRecord = { id: 'cal2', result: 'fail' };
      const mockCreate = jest.fn()
        .mockResolvedValueOnce({ id: 'r1' })
        .mockResolvedValueOnce({ id: 'r2' });
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn({
          calibrationRecord: { create: jest.fn().mockResolvedValue(createdRecord) },
          calibrationPointReading: { create: mockCreate },
          measuringEquipment: { update: jest.fn().mockResolvedValue({}) },
        }),
      );

      const result = await service.createCalibrationRecordWithReadings(
        { ...baseDto, readings: failReadings },
        'company-1',
      );

      expect(result.result).toBe('fail');
    });

    it('creates NonConformance for each failed reading when result is fail', async () => {
      prisma.measuringEquipment.findFirst.mockResolvedValue({ id: 'eq1', company_id: 'company-1' });
      const createdRecord = { id: 'cal3', result: 'fail' };
      const mockCreate = jest.fn()
        .mockResolvedValueOnce({ id: 'r1' })   // P1 (pass)
        .mockResolvedValueOnce({ id: 'r2' });  // P2 (fail)
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn({
          calibrationRecord: { create: jest.fn().mockResolvedValue(createdRecord) },
          calibrationPointReading: { create: mockCreate },
          measuringEquipment: { update: jest.fn().mockResolvedValue({}) },
        }),
      );
      ncServiceMock.createFromCalibrationReading.mockResolvedValue({ id: 'nc1' });

      await service.createCalibrationRecordWithReadings(
        { ...baseDto, readings: failReadings, userId: 'user1' },
        'company-1',
      );

      // Called once for the one failed reading (P2)
      expect(ncServiceMock.createFromCalibrationReading).toHaveBeenCalledTimes(1);
      expect(ncServiceMock.createFromCalibrationReading).toHaveBeenCalledWith(
        expect.objectContaining({
          calibrationRecordId: 'cal3',
          companyId: 'company-1',
          userId: 'user1',
        }),
      );
    });

    it('uses per-item create (not createMany) so DB-generated ids are available', async () => {
      prisma.measuringEquipment.findFirst.mockResolvedValue({ id: 'eq1', company_id: 'company-1' });
      const createdRecord = { id: 'cal-x', result: 'pass' };
      const mockCreate = jest.fn()
        .mockResolvedValueOnce({ id: 'reading-id-1' })
        .mockResolvedValueOnce({ id: 'reading-id-2' });
      const mockCreateMany = jest.fn();
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn({
          calibrationRecord: { create: jest.fn().mockResolvedValue(createdRecord) },
          calibrationPointReading: { create: mockCreate, createMany: mockCreateMany },
          measuringEquipment: { update: jest.fn().mockResolvedValue({}) },
        }),
      );

      await service.createCalibrationRecordWithReadings(
        { ...baseDto, readings: passReadings },
        'company-1',
      );

      expect(mockCreate).toHaveBeenCalledTimes(passReadings.length);
      expect(mockCreateMany).not.toHaveBeenCalled();
    });

    it('passes DB row id (not position label) as readingId when creating NC for failed reading', async () => {
      prisma.measuringEquipment.findFirst.mockResolvedValue({ id: 'eq1', company_id: 'company-1' });
      const createdRecord = { id: 'cal-y', result: 'fail' };
      // failReadings: P1=pass, P2=fail
      const mockCreate = jest.fn()
        .mockResolvedValueOnce({ id: 'db-reading-id-1' })   // P1
        .mockResolvedValueOnce({ id: 'db-reading-id-2' });  // P2 (the failing one)
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn({
          calibrationRecord: { create: jest.fn().mockResolvedValue(createdRecord) },
          calibrationPointReading: { create: mockCreate },
          measuringEquipment: { update: jest.fn().mockResolvedValue({}) },
        }),
      );
      ncServiceMock.createFromCalibrationReading.mockResolvedValue({ id: 'nc-1' });

      await service.createCalibrationRecordWithReadings(
        { ...baseDto, readings: failReadings, userId: 'user1' },
        'company-1',
      );

      expect(ncServiceMock.createFromCalibrationReading).toHaveBeenCalledTimes(1);
      expect(ncServiceMock.createFromCalibrationReading).toHaveBeenCalledWith(
        expect.objectContaining({
          readingId: 'db-reading-id-2',
        }),
      );
    });

    it('throws NotFoundException when equipment does not belong to company', async () => {
      prisma.measuringEquipment.findFirst.mockResolvedValue(null);

      await expect(
        service.createCalibrationRecordWithReadings(
          { ...baseDto, readings: passReadings },
          'other-company',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
