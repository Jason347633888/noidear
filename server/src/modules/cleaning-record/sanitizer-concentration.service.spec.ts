import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SanitizerConcentrationService } from './sanitizer-concentration.service';

function makeCheck(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sc-1',
    company_id: 'company-1',
    area_point_id: 'area-1',
    disinfectant_type: '次氯酸钠',
    target_concentration: '200.0000',
    actual_concentration: '180.0000',
    unit: 'mg/L',
    judgment: 'pass',
    checked_at: new Date('2024-01-01T10:00:00Z'),
    operator_id: 'user-1',
    verifier_id: null,
    notes: null,
    appeared_in_source_forms: [],
    source_form_version: null,
    source_form_field_group: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function createPrismaMock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    workshopArea: {
      findFirst: jest.fn().mockResolvedValue({ id: 'area-1', name: '消毒间A' }),
    },
    sanitizerConcentrationCheck: {
      create: jest.fn().mockResolvedValue(makeCheck()),
      findMany: jest.fn().mockResolvedValue([makeCheck()]),
      findUnique: jest.fn().mockResolvedValue(makeCheck()),
    },
    nonConformance: {
      create: jest.fn().mockResolvedValue({ id: 'nc-1' }),
    },
    qualityNumberSequence: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ current_no: 1 }),
    },
    ...overrides,
  } as any;
}

function createNcServiceMock() {
  return {
    create: jest.fn().mockResolvedValue({ id: 'nc-1', nc_no: 'NC-001' }),
  } as any;
}

describe('SanitizerConcentrationService', () => {
  describe('create', () => {
    it('creates a pass check without creating NonConformance', async () => {
      const prisma = createPrismaMock();
      const ncService = createNcServiceMock();
      const service = new SanitizerConcentrationService(prisma, ncService);

      await service.create(
        {
          area_point_id: 'area-1',
          disinfectant_type: '次氯酸钠',
          actual_concentration: 180,
          unit: 'mg/L',
          judgment: 'pass',
          checked_at: '2024-01-01T10:00:00Z',
        },
        'user-1',
        'company-1',
      );

      expect(prisma.sanitizerConcentrationCheck.create).toHaveBeenCalled();
      expect(ncService.create).not.toHaveBeenCalled();
    });

    it('creates a fail check without auto-creating NonConformance', async () => {
      const prisma = createPrismaMock({
        sanitizerConcentrationCheck: {
          create: jest.fn().mockResolvedValue(makeCheck({ judgment: 'fail', actual_concentration: '50.0000' })),
          findMany: jest.fn().mockResolvedValue([]),
          findUnique: jest.fn().mockResolvedValue(makeCheck({ judgment: 'fail' })),
        },
      });
      const ncService = createNcServiceMock();
      const service = new SanitizerConcentrationService(prisma, ncService);

      const result = await service.create(
        {
          area_point_id: 'area-1',
          disinfectant_type: '次氯酸钠',
          actual_concentration: 50,
          unit: 'mg/L',
          judgment: 'fail',
          checked_at: '2024-01-01T10:00:00Z',
        },
        'user-1',
        'company-1',
      );

      expect(result.judgment).toBe('fail');
      // NC is NOT auto-created on record creation; user calls dedicated endpoint
      expect(ncService.create).not.toHaveBeenCalled();
    });

    it('rejects creation without areaPointId', async () => {
      const prisma = createPrismaMock();
      const ncService = createNcServiceMock();
      const service = new SanitizerConcentrationService(prisma, ncService);

      await expect(
        service.create(
          {
            area_point_id: '',
            disinfectant_type: '次氯酸钠',
            actual_concentration: 180,
            unit: 'mg/L',
            judgment: 'pass',
            checked_at: '2024-01-01T10:00:00Z',
          },
          'user-1',
          'company-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid judgment value', async () => {
      const prisma = createPrismaMock();
      const ncService = createNcServiceMock();
      const service = new SanitizerConcentrationService(prisma, ncService);

      await expect(
        service.create(
          {
            area_point_id: 'area-1',
            disinfectant_type: '次氯酸钠',
            actual_concentration: 180,
            unit: 'mg/L',
            judgment: 'unknown' as any,
            checked_at: '2024-01-01T10:00:00Z',
          },
          'user-1',
          'company-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('stores source-form backlink fields when provided', async () => {
      const prisma = createPrismaMock();
      const ncService = createNcServiceMock();
      const service = new SanitizerConcentrationService(prisma, ncService);

      await service.create(
        {
          area_point_id: 'area-1',
          disinfectant_type: '次氯酸钠',
          actual_concentration: 180,
          unit: 'mg/L',
          judgment: 'pass',
          checked_at: '2024-01-01T10:00:00Z',
          appeared_in_source_forms: ['F-001'],
          source_form_version: 'v1',
          source_form_field_group: 'section-3',
        },
        'user-1',
        'company-1',
      );

      expect(prisma.sanitizerConcentrationCheck.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            appeared_in_source_forms: ['F-001'],
            source_form_version: 'v1',
            source_form_field_group: 'section-3',
          }),
        }),
      );
    });
  });

  describe('createNonConformance', () => {
    it('creates NonConformance with source_type sanitizer_concentration_check for a fail record', async () => {
      const failCheck = makeCheck({ judgment: 'fail', actual_concentration: '50.0000' });
      const prisma = createPrismaMock({
        sanitizerConcentrationCheck: {
          create: jest.fn().mockResolvedValue(failCheck),
          findMany: jest.fn().mockResolvedValue([failCheck]),
          findUnique: jest.fn().mockResolvedValue(failCheck),
        },
      });
      const ncService = createNcServiceMock();
      const service = new SanitizerConcentrationService(prisma, ncService);

      await service.createNonConformance('sc-1', 'user-1', 'company-1');

      expect(ncService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source_type: 'sanitizer_concentration_check',
          source_id: 'sc-1',
          source_item_id: null,
        }),
        'user-1',
        'company-1',
      );
    });

    it('rejects NonConformance creation for a passing check', async () => {
      const prisma = createPrismaMock();
      const ncService = createNcServiceMock();
      const service = new SanitizerConcentrationService(prisma, ncService);

      await expect(service.createNonConformance('sc-1', 'user-1', 'company-1')).rejects.toThrow(
        BadRequestException,
      );

      expect(ncService.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when check does not exist', async () => {
      const prisma = createPrismaMock({
        sanitizerConcentrationCheck: {
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
          findUnique: jest.fn().mockResolvedValue(null),
        },
      });
      const ncService = createNcServiceMock();
      const service = new SanitizerConcentrationService(prisma, ncService);

      await expect(service.createNonConformance('nonexistent', 'user-1', 'company-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
