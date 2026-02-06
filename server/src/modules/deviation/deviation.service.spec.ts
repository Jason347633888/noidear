import { Test, TestingModule } from '@nestjs/testing';
import { DeviationService } from './deviation.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DeviationService - detectDeviations', () => {
  let service: DeviationService;

  const mockPrismaService = {
    deviationReport: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    template: { findUnique: jest.fn() },
    taskRecord: { findUnique: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviationService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<DeviationService>(DeviationService);
  });

  afterEach(() => jest.clearAllMocks());

  it('应该检测到范围公差偏离', () => {
    const templateFields = [{
      name: 'temperature',
      label: '温度',
      type: 'number',
      required: true,
      tolerance: { type: 'range', min: 175, max: 185, unit: '°C' },
    }];

    const actualData = { temperature: 190 };
    const deviations = service.detectDeviations(templateFields, actualData);

    expect(deviations).toHaveLength(1);
    expect(deviations[0]).toMatchObject({
      fieldName: 'temperature',
      expectedValue: '180',
      actualValue: '190',
      toleranceMin: 175,
      toleranceMax: 185,
      deviationAmount: 5,
      deviationType: 'range',
    });
  });

  it('应该在正常范围内不检测偏离', () => {
    const templateFields = [{
      name: 'temperature',
      label: '温度',
      type: 'number',
      required: true,
      tolerance: { type: 'range', min: 175, max: 185, unit: '°C' },
    }];

    const actualData = { temperature: 180 };
    const deviations = service.detectDeviations(templateFields, actualData);

    expect(deviations).toHaveLength(0);
  });
});
