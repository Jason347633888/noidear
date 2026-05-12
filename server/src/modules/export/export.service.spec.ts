import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from './export.service';
import { DocumentExportService } from './services/document-export.service';
import { TaskExportService } from './services/task-export.service';
import { DeviationExportService } from './services/deviation-export.service';
import { ApprovalExportService } from './services/approval-export.service';
import { UserExportService } from './services/user-export.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ExportDocumentsDto,
  ExportTasksDto,
  ExportTaskRecordsDto,
  ExportDeviationReportsDto,
  ExportApprovalsDto,
  ExportUsersDto,
} from './dto';

describe('ExportService (facade delegation)', () => {
  let service: ExportService;
  let documentExport: jest.Mocked<DocumentExportService>;
  let taskExport: jest.Mocked<TaskExportService>;
  let deviationExport: jest.Mocked<DeviationExportService>;
  let approvalExport: jest.Mocked<ApprovalExportService>;
  let userExport: jest.Mocked<UserExportService>;

  const fakeBuffer = Buffer.from('fake-excel');

  beforeEach(async () => {
    const mockDocumentExport = { exportDocuments: jest.fn().mockResolvedValue(fakeBuffer) };
    const mockTaskExport = {
      exportTasks: jest.fn().mockResolvedValue(fakeBuffer),
      exportTaskRecords: jest.fn().mockResolvedValue(fakeBuffer),
    };
    const mockDeviationExport = { exportDeviationReports: jest.fn().mockResolvedValue(fakeBuffer) };
    const mockApprovalExport = { exportApprovals: jest.fn().mockResolvedValue(fakeBuffer) };
    const mockUserExport = { exportUsers: jest.fn().mockResolvedValue(fakeBuffer) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: DocumentExportService, useValue: mockDocumentExport },
        { provide: TaskExportService, useValue: mockTaskExport },
        { provide: DeviationExportService, useValue: mockDeviationExport },
        { provide: ApprovalExportService, useValue: mockApprovalExport },
        { provide: UserExportService, useValue: mockUserExport },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    documentExport = module.get(DocumentExportService);
    taskExport = module.get(TaskExportService);
    deviationExport = module.get(DeviationExportService);
    approvalExport = module.get(ApprovalExportService);
    userExport = module.get(UserExportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exportDocuments delegates to DocumentExportService', async () => {
    const dto: ExportDocumentsDto = { level: 1 };
    const user = { id: 'u1', roleCode: 'admin' };
    const result = await service.exportDocuments(dto, user);
    expect(documentExport.exportDocuments).toHaveBeenCalledWith(dto, user);
    expect(result).toBe(fakeBuffer);
  });

  it('exportTasks delegates to TaskExportService', async () => {
    const dto: ExportTasksDto = { status: 'pending' };
    const result = await service.exportTasks(dto);
    expect(taskExport.exportTasks).toHaveBeenCalledWith(dto, undefined);
    expect(result).toBe(fakeBuffer);
  });

  it('exportTaskRecords delegates to TaskExportService', async () => {
    const dto: ExportTaskRecordsDto = {};
    const result = await service.exportTaskRecords(dto);
    expect(taskExport.exportTaskRecords).toHaveBeenCalledWith(dto, undefined);
    expect(result).toBe(fakeBuffer);
  });

  it('exportDeviationReports delegates to DeviationExportService', async () => {
    const dto: ExportDeviationReportsDto = { status: 'pending' };
    const result = await service.exportDeviationReports(dto);
    expect(deviationExport.exportDeviationReports).toHaveBeenCalledWith(dto, undefined);
    expect(result).toBe(fakeBuffer);
  });

  it('exportApprovals delegates to ApprovalExportService', async () => {
    const dto: ExportApprovalsDto = { approverId: 'u2' };
    const result = await service.exportApprovals(dto);
    expect(approvalExport.exportApprovals).toHaveBeenCalledWith(dto, undefined);
    expect(result).toBe(fakeBuffer);
  });

  it('exportUsers delegates to UserExportService', async () => {
    const dto: ExportUsersDto = { status: 'active' };
    const result = await service.exportUsers(dto);
    expect(userExport.exportUsers).toHaveBeenCalledWith(dto);
    expect(result).toBe(fakeBuffer);
  });
});

describe('DocumentExportService (integration)', () => {
  let documentExportService: DocumentExportService;
  let mockPrisma: any;

  const mockDocuments = [
    {
      id: 'doc-1',
      number: '1-IT-001',
      title: '技术方案',
      level: 1,
      version: 1.0,
      status: 'approved',
      createdAt: new Date('2026-01-01'),
      approvedAt: new Date('2026-01-02'),
      creator: { id: 'user-1', name: '张三' },
      approver: { id: 'user-2', name: '李四' },
    },
  ];

  beforeEach(async () => {
    mockPrisma = {
      document: {
        findMany: jest.fn().mockResolvedValue(mockDocuments),
        count: jest.fn().mockResolvedValue(1),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentExportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    documentExportService = module.get<DocumentExportService>(DocumentExportService);
  });

  it('should return a buffer with data', async () => {
    const dto: ExportDocumentsDto = {
      level: 1,
      fields: ['number', 'title', 'status'],
    };

    const buffer = await documentExportService.exportDocuments(dto);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(mockPrisma.document.count).toHaveBeenCalled();
    expect(mockPrisma.document.findMany).toHaveBeenCalled();
  });

  it('should return empty workbook buffer when no data', async () => {
    mockPrisma.document.count.mockResolvedValue(0);

    const dto: ExportDocumentsDto = { level: 2 };
    const buffer = await documentExportService.exportDocuments(dto);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(mockPrisma.document.findMany).not.toHaveBeenCalled();
  });

  it('should apply filters correctly', async () => {
    mockPrisma.document.count.mockResolvedValue(0);

    const dto: ExportDocumentsDto = {
      level: 1,
      status: 'approved',
      keyword: '技术',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    };

    await documentExportService.exportDocuments(dto);

    expect(mockPrisma.document.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        level: 1,
        status: 'approved',
        OR: expect.arrayContaining([
          { title: { contains: '技术' } },
          { number: { contains: '技术' } },
        ]),
        createdAt: {
          gte: expect.any(Date),
          lte: expect.any(Date),
        },
        deletedAt: null,
      }),
    });
  });

  it('should paginate large datasets', async () => {
    mockPrisma.document.count.mockResolvedValue(2500);
    mockPrisma.document.findMany.mockImplementation((args: any) => {
      const skip = args.skip || 0;
      const take = args.take || 1000;
      return Promise.resolve(
        Array(Math.min(take, 2500 - skip)).fill(mockDocuments[0]),
      );
    });

    const dto: ExportDocumentsDto = { level: 1 };
    const buffer = await documentExportService.exportDocuments(dto);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(mockPrisma.document.findMany).toHaveBeenCalledTimes(3);
  });
});
