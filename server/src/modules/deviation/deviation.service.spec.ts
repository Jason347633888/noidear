import { Test, TestingModule } from '@nestjs/testing';
import { DeviationService } from './deviation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalService } from '../approval/approval.service';

describe('DeviationService - detectDeviations', () => {
  let service: DeviationService;

  const mockPrismaService = {
    deviationReport: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    template: { findUnique: jest.fn() },
    taskRecord: { findUnique: jest.fn(), update: jest.fn() },
  };

  const mockApprovalService = {
    createApprovalChain: jest.fn().mockResolvedValue({ id: 'chain-1' }),
    approve: jest.fn().mockResolvedValue({ success: true }),
    reject: jest.fn().mockResolvedValue({ success: true }),
    findOne: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ApprovalService, useValue: mockApprovalService },
      ],
    }).compile();

    service = module.get<DeviationService>(DeviationService);
  });

  afterEach(() => jest.clearAllMocks());

  it('应该检测到范围公差偏离（高于最大值）', () => {
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

  it('应该检测到范围公差偏离（低于最小值）', () => {
    const templateFields = [{
      name: 'temperature',
      label: '温度',
      type: 'number',
      required: true,
      tolerance: { type: 'range', min: 175, max: 185, unit: '°C' },
    }];

    const actualData = { temperature: 170 };
    const deviations = service.detectDeviations(templateFields, actualData);

    expect(deviations).toHaveLength(1);
    expect(deviations[0]).toMatchObject({
      fieldName: 'temperature',
      expectedValue: '180',
      actualValue: '170',
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

  it('应该检测到百分比公差偏离', () => {
    const templateFields = [{
      name: 'concentration',
      label: '浓度',
      type: 'number',
      required: true,
      tolerance: { type: 'percentage', min: 80, max: 120, percentage: 10, unit: '%' },
    }];

    const actualData = { concentration: 115 };
    const deviations = service.detectDeviations(templateFields, actualData);

    expect(deviations).toHaveLength(1);
    expect(deviations[0]).toMatchObject({
      fieldName: 'concentration',
      deviationType: 'percentage',
    });
    expect(Math.abs(deviations[0].deviationRate)).toBeGreaterThan(10);
  });

  it('应该跳过非数字字段', () => {
    const templateFields = [{
      name: 'description',
      label: '描述',
      type: 'text',
      required: true,
    }];

    const actualData = { description: 'test value' };
    const deviations = service.detectDeviations(templateFields, actualData);

    expect(deviations).toHaveLength(0);
  });

  it('应该跳过没有公差的数字字段', () => {
    const templateFields = [{
      name: 'quantity',
      label: '数量',
      type: 'number',
      required: true,
    }];

    const actualData = { quantity: 100 };
    const deviations = service.detectDeviations(templateFields, actualData);

    expect(deviations).toHaveLength(0);
  });

  it('应该跳过 undefined 或 null 的值', () => {
    const templateFields = [{
      name: 'temperature',
      label: '温度',
      type: 'number',
      required: true,
      tolerance: { type: 'range', min: 175, max: 185, unit: '°C' },
    }];

    const actualData = { temperature: null };
    const deviations = service.detectDeviations(templateFields, actualData);

    expect(deviations).toHaveLength(0);
  });

  it('calculateDeviationRate 应该在期望值为0时返回0', () => {
    const rate = service.calculateDeviationRate(0, 100);
    expect(rate).toBe(0);
  });

  it('calculateDeviationRate 应该正确计算偏离率', () => {
    const rate = service.calculateDeviationRate(100, 110);
    expect(rate).toBe(10);
  });
});

describe('DeviationService - createDeviationReports', () => {
  let service: DeviationService;

  const mockPrismaService = {
    deviationReport: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    template: { findUnique: jest.fn() },
    taskRecord: { findUnique: jest.fn(), update: jest.fn() },
  };

  const mockApprovalService = {
    createApprovalChain: jest.fn().mockResolvedValue({ id: 'chain-1' }),
    approve: jest.fn().mockResolvedValue({ success: true }),
    reject: jest.fn().mockResolvedValue({ success: true }),
    findOne: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ApprovalService, useValue: mockApprovalService },
      ],
    }).compile();

    service = module.get<DeviationService>(DeviationService);
  });

  afterEach(() => jest.clearAllMocks());

  it('应该成功创建偏离报告', async () => {
    const deviations = [{
      fieldName: 'temperature',
      expectedValue: '180',
      actualValue: '190',
      toleranceMin: 175,
      toleranceMax: 185,
      deviationAmount: 5,
      deviationRate: 0,
      deviationType: 'range' as const,
    }];

    const reasons = { temperature: '设备故障导致温度偏高，已及时调整' };

    mockPrismaService.deviationReport.create.mockResolvedValue({
      id: 'report-1',
      recordId: 'record-1',
      templateId: 'template-1',
      ...deviations[0],
      reason: reasons.temperature,
      reportedBy: 'user-1',
      reportedAt: new Date(),
    });

    mockPrismaService.taskRecord.update.mockResolvedValue({});

    const reports = await service.createDeviationReports(
      'record-1',
      'template-1',
      deviations,
      reasons,
      'user-1',
    );

    expect(reports).toHaveLength(1);
    expect(mockPrismaService.deviationReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fieldName: 'temperature',
          reason: reasons.temperature,
          reportedBy: 'user-1',
        }),
      }),
    );
    expect(mockPrismaService.taskRecord.update).toHaveBeenCalledWith({
      where: { id: 'record-1' },
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
      deviationRate: 0,
      deviationType: 'range' as const,
    }];

    const reasons = {};

    await expect(
      service.createDeviationReports('record-1', 'template-1', deviations, reasons, 'user-1'),
    ).rejects.toThrow('字段 [temperature] 偏离，必须填写偏离原因');
  });

  it('应该在偏离原因过短时抛出异常', async () => {
    const deviations = [{
      fieldName: 'temperature',
      expectedValue: '180',
      actualValue: '190',
      toleranceMin: 175,
      toleranceMax: 185,
      deviationAmount: 5,
      deviationRate: 0,
      deviationType: 'range' as const,
    }];

    const reasons = { temperature: '太短了' };

    await expect(
      service.createDeviationReports('record-1', 'template-1', deviations, reasons, 'user-1'),
    ).rejects.toThrow('偏离原因至少需要10个字符');
  });

  it('应该在偏离原因过长时抛出异常', async () => {
    const deviations = [{
      fieldName: 'temperature',
      expectedValue: '180',
      actualValue: '190',
      toleranceMin: 175,
      toleranceMax: 185,
      deviationAmount: 5,
      deviationRate: 0,
      deviationType: 'range' as const,
    }];

    const reasons = { temperature: 'x'.repeat(501) };

    await expect(
      service.createDeviationReports('record-1', 'template-1', deviations, reasons, 'user-1'),
    ).rejects.toThrow('偏离原因最多500个字符');
  });
});

describe('DeviationService - findDeviationReports', () => {
  let service: DeviationService;

  const mockPrismaService = {
    deviationReport: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    template: { findUnique: jest.fn() },
    taskRecord: { findUnique: jest.fn(), update: jest.fn() },
  };

  const mockApprovalService = {
    createApprovalChain: jest.fn().mockResolvedValue({ id: 'chain-1' }),
    approve: jest.fn().mockResolvedValue({ success: true }),
    reject: jest.fn().mockResolvedValue({ success: true }),
    findOne: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ApprovalService, useValue: mockApprovalService },
      ],
    }).compile();

    service = module.get<DeviationService>(DeviationService);
  });

  afterEach(() => jest.clearAllMocks());

  it('应该成功查询偏离报告列表', async () => {
    const mockReports = [
      { id: 'report-1', fieldName: 'temperature', status: 'pending' },
      { id: 'report-2', fieldName: 'concentration', status: 'approved' },
    ];

    mockPrismaService.deviationReport.findMany.mockResolvedValue(mockReports);
    mockPrismaService.deviationReport.count.mockResolvedValue(2);

    const result = await service.findDeviationReports({ page: 1, limit: 20 });

    expect(result).toEqual({
      list: mockReports,
      total: 2,
      page: 1,
      limit: 20,
    });
    expect(mockPrismaService.deviationReport.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      skip: 0,
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        record: {
          include: {
            task: {
              include: {
                department: true,
              },
            },
            template: true,
          },
        },
      },
    });
  });

  it('应该支持按模板ID筛选', async () => {
    mockPrismaService.deviationReport.findMany.mockResolvedValue([]);
    mockPrismaService.deviationReport.count.mockResolvedValue(0);

    await service.findDeviationReports({ templateId: 'template-1' });

    expect(mockPrismaService.deviationReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ templateId: 'template-1' }),
      }),
    );
  });

  it('应该支持按记录ID筛选', async () => {
    mockPrismaService.deviationReport.findMany.mockResolvedValue([]);
    mockPrismaService.deviationReport.count.mockResolvedValue(0);

    await service.findDeviationReports({ recordId: 'record-1' });

    expect(mockPrismaService.deviationReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ recordId: 'record-1' }),
      }),
    );
  });

  it('应该支持按状态筛选', async () => {
    mockPrismaService.deviationReport.findMany.mockResolvedValue([]);
    mockPrismaService.deviationReport.count.mockResolvedValue(0);

    await service.findDeviationReports({ status: 'approved' });

    expect(mockPrismaService.deviationReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'approved' }),
      }),
    );
  });

  it('应该支持按日期范围筛选', async () => {
    mockPrismaService.deviationReport.findMany.mockResolvedValue([]);
    mockPrismaService.deviationReport.count.mockResolvedValue(0);

    await service.findDeviationReports({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });

    expect(mockPrismaService.deviationReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-12-31'),
          },
        }),
      }),
    );
  });
});

describe('DeviationService - approveDeviationReport', () => {
  let service: DeviationService;

  const mockPrismaService = {
    deviationReport: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    template: { findUnique: jest.fn() },
    taskRecord: { findUnique: jest.fn(), update: jest.fn() },
  };

  const mockApprovalService = {
    createApprovalChain: jest.fn().mockResolvedValue({ id: 'chain-1' }),
    approve: jest.fn().mockResolvedValue({ success: true }),
    reject: jest.fn().mockResolvedValue({ success: true }),
    findOne: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ApprovalService, useValue: mockApprovalService },
      ],
    }).compile();

    service = module.get<DeviationService>(DeviationService);
  });

  afterEach(() => jest.clearAllMocks());

  it('应该成功审批偏离报告', async () => {
    const mockReport = {
      id: 'report-1',
      status: 'pending',
    };

    mockPrismaService.deviationReport.findUnique.mockResolvedValue(mockReport);
    mockPrismaService.deviationReport.update.mockResolvedValue({
      ...mockReport,
      status: 'approved',
      approvedBy: 'approver-1',
    });

    const result = await service.approveDeviationReport(
      'report-1',
      'approver-1',
      'approved',
      '审批通过',
    );

    expect(result.status).toBe('approved');
    expect(mockPrismaService.deviationReport.update).toHaveBeenCalledWith({
      where: { id: 'report-1' },
      data: expect.objectContaining({
        status: 'approved',
        approvedBy: 'approver-1',
        comment: '审批通过',
      }),
    });
  });

  it('应该在报告不存在时抛出异常', async () => {
    mockPrismaService.deviationReport.findUnique.mockResolvedValue(null);

    await expect(
      service.approveDeviationReport('report-1', 'approver-1', 'approved'),
    ).rejects.toThrow('偏离报告不存在');
  });

  it('应该在报告已审批时抛出异常', async () => {
    const mockReport = {
      id: 'report-1',
      status: 'approved',
    };

    mockPrismaService.deviationReport.findUnique.mockResolvedValue(mockReport);

    await expect(
      service.approveDeviationReport('report-1', 'approver-1', 'approved'),
    ).rejects.toThrow('偏离报告已审批');
  });
});
