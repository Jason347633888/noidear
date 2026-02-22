import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { OperationLogService } from '../../operation-log/operation-log.service';
import { StorageService } from '../../../common/services/storage.service';
import { QueryReportDto } from './dto';

describe('ReportService', () => {
  let service: ReportService;
  let mockPrismaService: any;
  let mockOperationLogService: any;
  let mockStorageService: any;

  const mockAuditor = {
    userId: 'auditor-1',
    username: 'auditor',
    role: 'auditor',
  };

  const mockPlan = {
    id: 'plan-1',
    title: '2024-Q1 Internal Audit',
    type: 'quarterly',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-03-31'),
    status: 'pending_rectification',
    auditorId: 'auditor-1',
    auditor: {
      id: 'auditor-1',
      username: 'auditor',
    },
    findings: [
      {
        id: 'finding-1',
        documentId: 'doc-1',
        auditResult: '不符合',
        issueType: '需要修改',
        description: 'Test issue 1',
        department: '生产部',
        status: 'verified',
        rectificationVersion: '2.0',
        verifiedBy: 'auditor-1',
        verifiedAt: new Date('2024-04-15'),
        document: {
          number: 'GMP-SOP-001',
          title: '车间清洁规程',
          level: 2,
        },
      },
      {
        id: 'finding-2',
        documentId: 'doc-2',
        auditResult: '符合',
        issueType: null,
        description: 'Compliant',
        department: '质量部',
        status: 'verified',
        rectificationVersion: null,
        verifiedBy: null,
        verifiedAt: null,
        document: {
          number: 'GMP-WI-001',
          title: '清洁剂使用指南',
          level: 3,
        },
      },
    ],
  };

  const mockQualityDept = {
    id: 'dept-quality',
    name: '质量部',
    code: 'QA',
  };

  beforeEach(async () => {
    mockPrismaService = {
      auditPlan: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditReport: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      department: {
        findFirst: jest.fn(),
      },
      document: {
        create: jest.fn(),
      },
    };

    mockOperationLogService = {
      log: jest.fn(),
    };

    mockStorageService = {
      uploadBuffer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OperationLogService, useValue: mockOperationLogService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('completePlanAndGenerateReport', () => {
    it('should generate report successfully', async () => {
      const mockReport = {
        id: 'report-1',
        planId: 'plan-1',
        summary: { totalDocuments: 2, conformCount: 1, nonConformCount: 1 },
        pdfUrl: '/audit-reports/2024/plan-1.pdf',
        documentId: 'doc-archived-1',
      };

      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditReport.findUnique.mockResolvedValue(null);
      mockPrismaService.department.findFirst.mockResolvedValue(mockQualityDept);
      mockPrismaService.auditReport.count.mockResolvedValue(0);
      mockPrismaService.document.create.mockResolvedValue({
        id: 'doc-archived-1',
      });
      mockPrismaService.auditReport.create.mockResolvedValue(mockReport);
      mockPrismaService.auditPlan.update.mockResolvedValue({
        ...mockPlan,
        status: 'completed',
      });
      mockStorageService.uploadBuffer.mockResolvedValue(undefined);

      const result = await service.completePlanAndGenerateReport(
        'plan-1',
        'auditor-1',
      );

      expect(result.id).toBe('report-1');
      expect(result.plan.status).toBe('completed');
      expect(mockPrismaService.auditReport.create).toHaveBeenCalled();
      expect(mockPrismaService.auditPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: { status: 'completed' },
      });
      expect(mockOperationLogService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if plan not found', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.completePlanAndGenerateReport('plan-1', 'auditor-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the auditor', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue({
        ...mockPlan,
        auditorId: 'different-auditor',
      });

      await expect(
        service.completePlanAndGenerateReport('plan-1', 'auditor-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if plan status is not pending_rectification', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue({
        ...mockPlan,
        status: 'completed',
      });

      await expect(
        service.completePlanAndGenerateReport('plan-1', 'auditor-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if not all findings are verified', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue({
        ...mockPlan,
        findings: [
          {
            ...mockPlan.findings[0],
            status: 'pending_verification',
          },
        ],
      });

      await expect(
        service.completePlanAndGenerateReport('plan-1', 'auditor-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.completePlanAndGenerateReport('plan-1', 'auditor-1'),
      ).rejects.toThrow(/not yet verified/);
    });

    it('should throw ConflictException if report already exists', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditReport.findUnique.mockResolvedValue({
        id: 'existing-report',
      });

      await expect(
        service.completePlanAndGenerateReport('plan-1', 'auditor-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if quality department not found', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditReport.findUnique.mockResolvedValue(null);
      mockPrismaService.department.findFirst.mockResolvedValue(null);

      await expect(
        service.completePlanAndGenerateReport('plan-1', 'auditor-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.completePlanAndGenerateReport('plan-1', 'auditor-1'),
      ).rejects.toThrow(/质量部/);
    });

    it('should generate correct document number format', async () => {
      const mockReport = {
        id: 'report-1',
        planId: 'plan-1',
        summary: { totalDocuments: 2, conformCount: 1, nonConformCount: 1 },
        pdfUrl: '/audit-reports/2024/plan-1.pdf',
        documentId: 'doc-archived-1',
      };

      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditReport.findUnique.mockResolvedValue(null);
      mockPrismaService.department.findFirst.mockResolvedValue(mockQualityDept);
      mockPrismaService.auditReport.count.mockResolvedValue(5);
      mockPrismaService.document.create.mockResolvedValue({
        id: 'doc-archived-1',
      });
      mockPrismaService.auditReport.create.mockResolvedValue(mockReport);
      mockPrismaService.auditPlan.update.mockResolvedValue({
        ...mockPlan,
        status: 'completed',
      });
      mockStorageService.uploadBuffer.mockResolvedValue(undefined);

      await service.completePlanAndGenerateReport('plan-1', 'auditor-1');

      const year = new Date().getFullYear();
      expect(mockPrismaService.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            number: `REC-AUDIT-${year}-006`,
          }),
        }),
      );
    });
  });

  describe('queryReports', () => {
    it('should return all reports when no filter provided', async () => {
      const mockReports = [
        {
          id: 'report-1',
          planId: 'plan-1',
          summary: {},
          pdfUrl: '/path/to/pdf',
          documentId: 'doc-1',
        },
      ];

      mockPrismaService.auditReport.findMany.mockResolvedValue(mockReports);

      const result = await service.queryReports({});

      expect(result).toEqual(mockReports);
      expect(mockPrismaService.auditReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should filter reports by planId', async () => {
      const dto: QueryReportDto = { planId: 'plan-1' };
      const mockReports = [
        {
          id: 'report-1',
          planId: 'plan-1',
          summary: {},
          pdfUrl: '/path/to/pdf',
          documentId: 'doc-1',
        },
      ];

      mockPrismaService.auditReport.findMany.mockResolvedValue(mockReports);

      const result = await service.queryReports(dto);

      expect(result).toEqual(mockReports);
      expect(mockPrismaService.auditReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { planId: 'plan-1' },
        }),
      );
    });

    it('should return empty array if no reports found', async () => {
      mockPrismaService.auditReport.findMany.mockResolvedValue([]);

      const result = await service.queryReports({});

      expect(result).toEqual([]);
    });
  });
});
