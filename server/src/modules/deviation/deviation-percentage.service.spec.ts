import { Test, TestingModule } from '@nestjs/testing';
import { DeviationService } from './deviation.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DeviationService - 百分比公差检测', () => {
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

  it('应该检测到百分比公差偏离', () => {
    const templateFields = [{
      name: 'weight',
      label: '重量',
      type: 'number',
      required: true,
      tolerance: { type: 'percentage', percentage: 5, min: 95, max: 105, unit: 'g' },
    }];

    const actualData = { weight: 110 };
    const deviations = service.detectDeviations(templateFields, actualData);

    expect(deviations).toHaveLength(1);
    expect(deviations[0].deviationRate).toBeCloseTo(10, 1);
  });

  it('应该跳过没有公差配置的字段', () => {
    const templateFields = [{
      name: 'notes',
      label: '备注',
      type: 'text',
      required: false,
    }];

    const actualData = { notes: 'some text' };
    const deviations = service.detectDeviations(templateFields, actualData);

    expect(deviations).toHaveLength(0);
  });
});
