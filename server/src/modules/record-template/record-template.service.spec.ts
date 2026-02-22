import { Test, TestingModule } from '@nestjs/testing';
import { RecordTemplateService } from './record-template.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('RecordTemplateService', () => {
  let service: RecordTemplateService;
  let prisma: PrismaService;

  const mockPrismaService: any = {
    recordTemplate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockTemplate = {
    id: 'tpl_001',
    code: 'TEMP_001',
    name: '生产记录模板',
    fieldsJson: {
      fields: [
        { name: 'productName', type: 'text', required: true },
        { name: 'quantity', type: 'number', required: true },
      ],
    },
    version: 1,
    retentionYears: 3,
    status: 'active',
    description: '生产部门记录模板',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordTemplateService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RecordTemplateService>(RecordTemplateService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建记录模板', async () => {
      const createDto = {
        code: 'TEMP_001',
        name: '生产记录模板',
        fieldsJson: {
          fields: [
            { name: 'productName', type: 'text', required: true },
          ],
        },
        retentionYears: 3,
        description: '生产部门记录模板',
      };

      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(null);
      mockPrismaService.recordTemplate.create.mockResolvedValue(mockTemplate);

      const result = await service.create(createDto);

      expect(result).toEqual(mockTemplate);
      expect(prisma.recordTemplate.findUnique).toHaveBeenCalledWith({
        where: { code: createDto.code },
      });
      expect(prisma.recordTemplate.create).toHaveBeenCalled();
    });

    it('应该拒绝重复的模板编号（BR-211）', async () => {
      const createDto = {
        code: 'TEMP_001',
        name: '生产记录模板',
        fieldsJson: { fields: [] },
        retentionYears: 3,
      };

      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(mockTemplate);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow('模板编号 TEMP_001 已存在');
    });

    it('应该验证 fieldsJson 结构', async () => {
      const createDto = {
        code: 'TEMP_002',
        name: '测试模板',
        fieldsJson: null, // 无效的 fieldsJson
        retentionYears: 3,
      };

      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('应该返回分页的模板列表', async () => {
      const query = { page: 1, limit: 10, status: 'active' };
      const templates = [mockTemplate];

      mockPrismaService.recordTemplate.findMany.mockResolvedValue(templates);
      mockPrismaService.recordTemplate.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toEqual(templates);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('应该支持按状态筛选', async () => {
      const query = { page: 1, limit: 10, status: 'archived' };

      mockPrismaService.recordTemplate.findMany.mockResolvedValue([]);
      mockPrismaService.recordTemplate.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prisma.recordTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'archived' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('应该返回单个模板详情', async () => {
      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await service.findOne('tpl_001');

      expect(result).toEqual(mockTemplate);
      expect(prisma.recordTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'tpl_001' },
      });
    });

    it('应该在模板不存在时抛出异常', async () => {
      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid_id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid_id')).rejects.toThrow('模板不存在');
    });
  });

  describe('update', () => {
    it('应该成功更新模板', async () => {
      const updateDto = {
        name: '更新后的模板名称',
        description: '更新后的描述',
      };

      const updatedTemplate = { ...mockTemplate, ...updateDto };

      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.recordTemplate.update.mockResolvedValue(updatedTemplate);

      const result = await service.update('tpl_001', updateDto);

      expect(result).toEqual(updatedTemplate);
      expect(prisma.recordTemplate.update).toHaveBeenCalledWith({
        where: { id: 'tpl_001' },
        data: updateDto,
      });
    });

    it('应该在更新不存在的模板时抛出异常', async () => {
      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid_id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('archive', () => {
    it('应该成功归档模板（BR-212）', async () => {
      const archivedTemplate = { ...mockTemplate, status: 'archived' };

      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.recordTemplate.update.mockResolvedValue(archivedTemplate);

      const result = await service.archive('tpl_001');

      expect(result.status).toBe('archived');
      expect(prisma.recordTemplate.update).toHaveBeenCalledWith({
        where: { id: 'tpl_001' },
        data: { status: 'archived' },
      });
    });

    it('应该在归档不存在的模板时抛出异常', async () => {
      mockPrismaService.recordTemplate.findUnique.mockResolvedValue(null);

      await expect(service.archive('invalid_id')).rejects.toThrow(NotFoundException);
    });
  });
});
