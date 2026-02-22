import { Test, TestingModule } from '@nestjs/testing';
import { RecordService } from './record.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('RecordService', () => {
  let service: RecordService;
  let prisma: PrismaService;

  const mockPrismaService = {
    recordTemplate: {
      findUnique: jest.fn(),
    },
    record: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    recordChangeLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockTemplate = {
    id: 'template-1',
    code: 'TPL-001',
    name: 'Test Template',
    fieldsJson: {
      fields: [
        { name: 'field1', type: 'text', required: true },
        { name: 'field2', type: 'number', required: false },
      ],
    },
    retentionYears: 3,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRecord = {
    id: 'record-1',
    templateId: 'template-1',
    number: 'REC-20260215-0001',
    dataJson: { field1: 'value1', field2: 123 },
    status: 'draft',
    retentionUntil: new Date('2029-02-15'),
    createdBy: 'user-1',
    submittedAt: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RecordService>(RecordService);
    prisma = module.get<PrismaService>(PrismaService);

    // 重置所有mock
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a record with auto-generated number (BR-221)', async () => {
      const createDto = { templateId: 'template-1', dataJson: { field1: 'value1' } };
      const userId = 'user-1';

      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.record.findFirst.mockResolvedValue(null); // 无已有记录
      mockPrismaService.record.create.mockResolvedValue(mockRecord);

      const result = await service.create(createDto, userId);

      expect(mockPrismaService.recordTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });
      expect(mockPrismaService.record.create).toHaveBeenCalled();
      expect(result).toEqual(mockRecord);
      expect(result.number).toMatch(/^REC-\d{8}-\d{4}$/); // 验证编号格式
    });

    it('should increment record number sequence', async () => {
      const createDto = { templateId: 'template-1', dataJson: { field1: 'value1' } };
      const userId = 'user-1';
      const existingRecord = { ...mockRecord, number: 'REC-20260215-0005' };

      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.record.findFirst.mockResolvedValue(existingRecord);
      mockPrismaService.record.create.mockResolvedValue({
        ...mockRecord,
        number: 'REC-20260215-0006',
      });

      const result = await service.create(createDto, userId);

      expect(result.number).toBe('REC-20260215-0006');
    });

    it('should throw NotFoundException if template not found', async () => {
      const createDto = { templateId: 'invalid-template', dataJson: { field1: 'value1' } };
      const userId = 'user-1';

      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should validate required fields in dataJson', async () => {
      const createDto = { templateId: 'template-1', dataJson: {} }; // 缺少 field1
      const userId = 'user-1';

      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(mockTemplate);

      await expect(service.create(createDto, userId)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto, userId)).rejects.toThrow('Required field field1 is missing');
    });

    it('should calculate retentionUntil based on template retentionYears', async () => {
      const createDto = { templateId: 'template-1', dataJson: { field1: 'value1' } };
      const userId = 'user-1';

      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.record.findFirst.mockResolvedValue(null);
      mockPrismaService.record.create.mockResolvedValue(mockRecord);

      await service.create(createDto, userId);

      expect(mockPrismaService.record.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            retentionUntil: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated records', async () => {
      const query = { page: 1, limit: 10 };
      const mockRecords = [mockRecord];

      mockPrismaService.record.findMany.mockResolvedValue(mockRecords);
      mockPrismaService.record.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toEqual({
        data: mockRecords,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      const query = { page: 1, limit: 10, status: 'draft' };

      mockPrismaService.record.findMany.mockResolvedValue([mockRecord]);
      mockPrismaService.record.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(mockPrismaService.record.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'draft' }),
        }),
      );
    });

    it('should filter by templateId', async () => {
      const query = { page: 1, limit: 10, templateId: 'template-1' };

      mockPrismaService.record.findMany.mockResolvedValue([mockRecord]);
      mockPrismaService.record.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(mockPrismaService.record.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ templateId: 'template-1' }),
        }),
      );
    });

    it('should search by keyword in record number', async () => {
      const query = { page: 1, limit: 10, keyword: 'REC-202' };

      mockPrismaService.record.findMany.mockResolvedValue([mockRecord]);
      mockPrismaService.record.count.mockResolvedValue(1);

      await service.findAll(query);

      expect(mockPrismaService.record.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            number: { contains: 'REC-202' },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a record by id', async () => {
      mockPrismaService.record.findUnique.mockResolvedValue(mockRecord);

      const result = await service.findOne('record-1');

      expect(result).toEqual(mockRecord);
      expect(mockPrismaService.record.findUnique).toHaveBeenCalledWith({
        where: { id: 'record-1' },
      });
    });

    it('should throw NotFoundException if record not found', async () => {
      mockPrismaService.record.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a record', async () => {
      const updateDto = { dataJson: { field1: 'updated value' } };
      const userId = 'user-1';
      const updatedRecord = { ...mockRecord, dataJson: { field1: 'updated value' } };

      mockPrismaService.record.findUnique.mockResolvedValue(mockRecord);
      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.record.update.mockResolvedValue(updatedRecord);

      const result = await service.update('record-1', updateDto, userId);

      expect(result).toEqual(updatedRecord);
      expect(mockPrismaService.record.update).toHaveBeenCalledWith({
        where: { id: 'record-1' },
        data: updateDto,
      });
    });

    it('should throw NotFoundException if record not found', async () => {
      const updateDto = { dataJson: { field1: 'value' } };
      const userId = 'user-1';

      mockPrismaService.record.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-id', updateDto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should validate dataJson if provided', async () => {
      const updateDto = { dataJson: {} }; // 缺少必填字段
      const userId = 'user-1';

      mockPrismaService.record.findUnique.mockResolvedValue(mockRecord);
      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(mockTemplate);

      await expect(service.update('record-1', updateDto, userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete a record', async () => {
      const deletedRecord = { ...mockRecord, deletedAt: new Date() };

      mockPrismaService.record.findUnique.mockResolvedValue(mockRecord);
      mockPrismaService.record.update.mockResolvedValue(deletedRecord);

      const result = await service.remove('record-1');

      expect(result).toEqual(deletedRecord);
      expect(mockPrismaService.record.update).toHaveBeenCalledWith({
        where: { id: 'record-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if record not found', async () => {
      mockPrismaService.record.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getChangeLogs', () => {
    it('should return paginated change logs', async () => {
      const query = { page: 1, limit: 10 };
      const mockChangeLogs = [
        {
          id: 'log-1',
          recordId: 'record-1',
          oldData: { field1: 'old value' },
          newData: { field1: 'new value' },
          changedBy: 'user-1',
          changedAt: new Date(),
          reason: '数据修正',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.recordChangeLog.findMany.mockResolvedValue(mockChangeLogs);
      mockPrismaService.recordChangeLog.count.mockResolvedValue(1);

      const result = await service.getChangeLogs('record-1', query);

      expect(result).toEqual({
        data: mockChangeLogs,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockPrismaService.recordChangeLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recordId: 'record-1' },
        }),
      );
    });
  });
});
