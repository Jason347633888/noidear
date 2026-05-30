import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MetalDetectionService } from './metal-detection.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NonConformanceService } from '../non-conformance/non-conformance.service';

const makePrismaMock = () => ({
  metalDetectionLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  productionBatch: {
    findUnique: jest.fn(),
  },
  nonConformance: {
    create: jest.fn(),
  },
});

const makeNcServiceMock = () => ({
  create: jest.fn(),
});

describe('MetalDetectionService', () => {
  let service: MetalDetectionService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let ncService: ReturnType<typeof makeNcServiceMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    ncService = makeNcServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetalDetectionService,
        { provide: PrismaService, useValue: prisma },
        { provide: NonConformanceService, useValue: ncService },
      ],
    }).compile();

    service = module.get<MetalDetectionService>(MetalDetectionService);
  });

  describe('create', () => {
    it('throws BadRequestException when overall_pass=false and rejection_action is missing', async () => {
      prisma.productionBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        status: 'in_progress',
      });

      await expect(
        service.create(
          {
            production_batch_id: 'batch-1',
            fe_ball_spec: '1.5mm',
            sus_ball_spec: '2.0mm',
            al_ball_spec: '2.5mm',
            fe_test_pass: false,
            sus_test_pass: true,
            al_test_pass: true,
            overall_pass: false,
            // rejection_action intentionally omitted
          },
          'user-1',
          'company-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates NonConformance when overall_pass=false with rejection_action provided', async () => {
      const createdLog = {
        id: 'log-1',
        company_id: 'company-1',
        production_batch_id: 'batch-1',
        fe_ball_spec: '1.5mm',
        sus_ball_spec: null,
        al_ball_spec: null,
        fe_test_pass: false,
        sus_test_pass: true,
        al_test_pass: true,
        overall_pass: false,
        rejection_action: '隔离处理',
        operator_id: 'user-1',
        tested_at: new Date(),
        created_at: new Date(),
      };

      prisma.productionBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        status: 'in_progress',
      });
      prisma.metalDetectionLog.create.mockResolvedValue(createdLog);
      ncService.create.mockResolvedValue({ id: 'nc-1' });

      const result = await service.create(
        {
          production_batch_id: 'batch-1',
          fe_ball_spec: '1.5mm',
          fe_test_pass: false,
          sus_test_pass: true,
          al_test_pass: true,
          overall_pass: false,
          rejection_action: '隔离处理',
        },
        'user-1',
        'company-1',
      );

      expect(result).toBeDefined();
      expect(ncService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source_type: 'metal_detection_log',
          source_id: 'log-1',
          description: expect.stringContaining('1.5mm'),
        }),
        'user-1',
        'company-1',
      );
    });

    it('throws BadRequestException when productionBatch status is completed', async () => {
      prisma.productionBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        status: 'completed',
      });

      await expect(
        service.create(
          {
            production_batch_id: 'batch-1',
            fe_test_pass: true,
            sus_test_pass: true,
            al_test_pass: true,
            overall_pass: true,
          },
          'user-1',
          'company-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when productionBatch status is shipped', async () => {
      prisma.productionBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        status: 'shipped',
      });

      await expect(
        service.create(
          {
            production_batch_id: 'batch-1',
            fe_test_pass: true,
            sus_test_pass: true,
            al_test_pass: true,
            overall_pass: true,
          },
          'user-1',
          'company-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows creation when productionBatch status is in_progress and overall_pass=true', async () => {
      const createdLog = {
        id: 'log-2',
        company_id: 'company-1',
        production_batch_id: 'batch-1',
        fe_test_pass: true,
        sus_test_pass: true,
        al_test_pass: true,
        overall_pass: true,
        tested_at: new Date(),
        created_at: new Date(),
      };

      prisma.productionBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        status: 'in_progress',
      });
      prisma.metalDetectionLog.create.mockResolvedValue(createdLog);

      const result = await service.create(
        {
          production_batch_id: 'batch-1',
          fe_test_pass: true,
          sus_test_pass: true,
          al_test_pass: true,
          overall_pass: true,
        },
        'user-1',
        'company-1',
      );

      expect(result).toBeDefined();
      expect(ncService.create).not.toHaveBeenCalled();
    });
  });

  describe('createNonConformanceFromLog', () => {
    it('creates NC with source_type=metal_detection_log and includes failed ball specs in description', async () => {
      const log = {
        id: 'log-3',
        company_id: 'company-1',
        production_batch_id: 'batch-1',
        fe_ball_spec: '1.5mm',
        sus_ball_spec: '2.0mm',
        al_ball_spec: null,
        fe_test_pass: false,
        sus_test_pass: false,
        al_test_pass: true,
        overall_pass: false,
        rejection_action: '停线',
      };

      prisma.metalDetectionLog.findUnique.mockResolvedValue(log);
      ncService.create.mockResolvedValue({ id: 'nc-2' });

      const nc = await service.createNonConformanceFromLog('log-3', 'user-1', 'company-1');

      expect(ncService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source_type: 'metal_detection_log',
          source_id: 'log-3',
          description: expect.stringContaining('1.5mm'),
        }),
        'user-1',
        'company-1',
      );
      expect(nc).toBeDefined();
    });
  });
});
