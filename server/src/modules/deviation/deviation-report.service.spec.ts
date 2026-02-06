import { Test, TestingModule } from '@nestjs/testing';
import { DeviationService } from './deviation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('DeviationService - createDeviationReports', () => {
  let service: DeviationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    deviationReport: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    template: { findUnique: jest.fn() },
    taskRecord: { findUnique: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviationService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<DeviationService>(DeviationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  it('应该创建偏离报告并更新任务记录', async () => {
    const recordId = 'record-123';
    const templateId = 'template-123';
    const userId = 'user-123';
    const deviations = [{
      fieldName: 'temperature',
      expectedValue: '180',
      actualValue: '190',
      toleranceMin: 175,
      toleranceMax: 185,
      deviationAmount: 5,
      deviationRate: 5.6,
      deviationType: 'range' as const,
    }];
    const reasons = { temperature: '生产线温度控制器故障，已报修' };

    mockPrismaService.deviationReport.create.mockResolvedValue({
      id: 'report-123',
      recordId,
      status: 'pending',
    });

    mockPrismaService.taskRecord.update.mockResolvedValue({});

    const reports = await service.createDeviationReports(
      recordId,
      templateId,
      deviations,
      reasons,
      userId,
    );

    expect(reports).toHaveLength(1);
    expect(mockPrismaService.deviationReport.create).toHaveBeenCalledTimes(1);
    expect(mockPrismaService.taskRecord.update).toHaveBeenCalledWith({
      where: { id: recordId },
      data: { hasDeviation: true, deviationCount: 1 },
    });
  });

  it('应该在缺少偏离原因时抛出异常', async () => {
    const deviations = [{
      fieldName: 'temperature',
      expectedValue: '180',
      actualValue: '190',
      toleranceMin: 175,
      toleranceMax: 185,
      deviationAmount: 5,
      deviationRate: 5.6,
      deviationType: 'range' as const,
    }];
    const reasons = {};

    await expect(
      service.createDeviationReports('r1', 't1', deviations, reasons, 'u1'),
    ).rejects.toThrow(BusinessException);
  });
});
