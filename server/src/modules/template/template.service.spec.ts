import { Test, TestingModule } from '@nestjs/testing';
import { TemplateService } from './template.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ExcelParserService } from '../../common/services';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('TemplateService', () => {
  let service: TemplateService;

  const mockPrisma: any = {
    template: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };

  const mockExcelParser: any = {
    parseToTemplateFields: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ExcelParserService, useValue: mockExcelParser },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
  });

  afterEach(() => jest.clearAllMocks());

  // =========================================================================
  // Step 1.1: ID Generation Consistency
  // =========================================================================
  describe('ID Generation Consistency', () => {
    it('create() should return a Snowflake ID (numeric string), not UUID', async () => {
      // Setup: mock $transaction to execute the callback directly
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          $queryRaw: jest.fn().mockResolvedValue([{ count: 0n }]),
        });
      });

      mockPrisma.template.create.mockImplementation(async (args: any) => ({
        id: args.data.id,
        level: args.data.level,
        number: args.data.number,
        title: args.data.title,
        fieldsJson: args.data.fieldsJson,
        creatorId: args.data.creatorId,
        version: 1.0,
        status: 'active',
      }));

      const result = await service.create(
        {
          level: 1,
          title: 'Test Template',
          fields: [{ name: 'field1', label: 'Field 1', type: 'text', required: true }],
        },
        'user-123',
      );

      // Snowflake IDs are numeric strings (all digits), not UUID format
      const isSnowflakeId = /^\d+$/.test(result.id);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(result.id);

      expect(isSnowflakeId).toBe(true);
      expect(isUuid).toBe(false);
    });

    it('createFromExcel() should return a Snowflake ID', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          $queryRaw: jest.fn().mockResolvedValue([{ count: 0n }]),
        });
      });

      mockExcelParser.parseToTemplateFields.mockResolvedValue({
        fields: [{ name: 'col1', label: 'Column 1', type: 'text', required: true }],
        preview: [],
      });

      mockPrisma.template.create.mockImplementation(async (args: any) => ({
        id: args.data.id,
        level: args.data.level,
        number: args.data.number,
        title: args.data.title,
      }));

      const mockFile = { buffer: Buffer.from('test') } as Express.Multer.File;
      const result = await service.createFromExcel(mockFile, 1, 'user-123');

      expect(/^\d+$/.test(result.id)).toBe(true);
    });

    it('copy() should return a Snowflake ID', async () => {
      mockPrisma.template.findUnique.mockResolvedValue({
        id: '12345',
        level: 1,
        number: 'TPL10001',
        title: 'Original',
        fieldsJson: [{ name: 'f1', type: 'text' }],
        status: 'active',
        creatorId: 'user-1',
      });

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          $queryRaw: jest.fn().mockResolvedValue([{ count: 1n }]),
        });
      });

      mockPrisma.template.create.mockImplementation(async (args: any) => ({
        id: args.data.id,
        level: args.data.level,
        number: args.data.number,
        title: args.data.title,
        version: args.data.version,
      }));

      const result = await service.copy('12345', 'user-456');

      expect(/^\d+$/.test(result.id)).toBe(true);
    });

    it('all creation methods should produce consistent ID format', async () => {
      // Both create() and createFromExcel() should produce IDs
      // with the same format (Snowflake numeric string)
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          $queryRaw: jest.fn().mockResolvedValue([{ count: 0n }]),
        });
      });

      const createdIds: string[] = [];

      mockPrisma.template.create.mockImplementation(async (args: any) => {
        createdIds.push(args.data.id);
        return { id: args.data.id, level: 1, number: 'TPL10001', title: 'test' };
      });

      await service.create(
        { level: 1, title: 'Test 1', fields: [{ name: 'f', label: 'F', type: 'text', required: true }] },
        'user-1',
      );

      mockExcelParser.parseToTemplateFields.mockResolvedValue({
        fields: [{ name: 'col1', label: 'Col 1', type: 'text', required: true }],
        preview: [],
      });

      await service.createFromExcel(
        { buffer: Buffer.from('test') } as Express.Multer.File,
        1,
        'user-1',
      );

      // Both IDs should be numeric (Snowflake format)
      expect(createdIds).toHaveLength(2);
      expect(createdIds.every((id) => /^\d+$/.test(id))).toBe(true);
    });
  });

  // =========================================================================
  // Step 1.2: Creator Relation in Queries
  // =========================================================================
  describe('Creator Relation in Queries', () => {
    it('findAll() should include creator with id and name', async () => {
      const mockList = [
        {
          id: '1',
          title: 'Template A',
          creator: { id: 'user-1', name: 'Alice' },
        },
      ];
      mockPrisma.template.findMany.mockResolvedValue(mockList);
      mockPrisma.template.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      // Verify findMany was called with include for creator
      expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            creator: expect.objectContaining({
              select: expect.objectContaining({
                id: true,
                name: true,
              }),
            }),
          }),
        }),
      );

      expect(result.list[0].creator).toBeDefined();
      expect(result.list[0].creator.name).toBe('Alice');
    });

    it('findOne() should include creator with id and name', async () => {
      const mockTemplate = {
        id: '1',
        title: 'Template A',
        creator: { id: 'user-1', name: 'Alice' },
      };
      mockPrisma.template.findUnique.mockResolvedValue(mockTemplate);

      const result = await service.findOne('1');

      expect(mockPrisma.template.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            creator: expect.objectContaining({
              select: expect.objectContaining({
                id: true,
                name: true,
              }),
            }),
          }),
        }),
      );

      expect(result.creator).toBeDefined();
      expect(result.creator.name).toBe('Alice');
    });

    it('findAll() should still return correct pagination metadata', async () => {
      mockPrisma.template.findMany.mockResolvedValue([]);
      mockPrisma.template.count.mockResolvedValue(0);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(0);
      expect(result.list).toEqual([]);
    });
  });

  // =========================================================================
  // Step 1.3: Copy Version Reset
  // =========================================================================
  describe('Copy Version Reset', () => {
    it('copy() should explicitly set version to 1.0', async () => {
      const originalTemplate = {
        id: '12345',
        level: 2,
        number: 'TPL20001',
        title: 'Original Template',
        fieldsJson: [{ name: 'field1', type: 'number', label: 'Field 1' }],
        version: 3.5, // Original has been updated many times
        status: 'active',
        creatorId: 'user-1',
      };

      mockPrisma.template.findUnique.mockResolvedValue(originalTemplate);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          $queryRaw: jest.fn().mockResolvedValue([{ count: 5n }]),
        });
      });

      let capturedCreateData: any = null;
      mockPrisma.template.create.mockImplementation(async (args: any) => {
        capturedCreateData = args.data;
        return {
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      await service.copy('12345', 'user-456');

      // The copy should explicitly set version to 1.0, not inherit from original
      expect(capturedCreateData).toBeDefined();
      expect(Number(capturedCreateData.version)).toBe(1.0);
    });

    it('copy() should create independent template with new title suffix', async () => {
      const originalTemplate = {
        id: '12345',
        level: 1,
        number: 'TPL10001',
        title: 'Original',
        fieldsJson: [{ name: 'f1', type: 'text' }],
        version: 2.0,
        status: 'active',
        creatorId: 'user-1',
      };

      mockPrisma.template.findUnique.mockResolvedValue(originalTemplate);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          $queryRaw: jest.fn().mockResolvedValue([{ count: 1n }]),
        });
      });

      let capturedCreateData: any = null;
      mockPrisma.template.create.mockImplementation(async (args: any) => {
        capturedCreateData = args.data;
        return { ...args.data };
      });

      await service.copy('12345', 'user-456');

      expect(capturedCreateData.title).toContain('副本');
      expect(capturedCreateData.creatorId).toBe('user-456');
      expect(capturedCreateData.level).toBe(originalTemplate.level);
    });

    it('copy() should copy fieldsJson without mutation', async () => {
      const originalFields = [
        { name: 'temp', type: 'number', label: 'Temperature' },
        { name: 'desc', type: 'text', label: 'Description' },
      ];
      const originalTemplate = {
        id: '12345',
        level: 1,
        number: 'TPL10001',
        title: 'Original',
        fieldsJson: originalFields,
        version: 1.5,
        status: 'active',
        creatorId: 'user-1',
      };

      mockPrisma.template.findUnique.mockResolvedValue(originalTemplate);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          $queryRaw: jest.fn().mockResolvedValue([{ count: 1n }]),
        });
      });

      let capturedCreateData: any = null;
      mockPrisma.template.create.mockImplementation(async (args: any) => {
        capturedCreateData = args.data;
        return { ...args.data };
      });

      await service.copy('12345', 'user-456');

      // fieldsJson should be a deep copy, not a reference
      expect(capturedCreateData.fieldsJson).toEqual(originalFields);
    });
  });

  // =========================================================================
  // Step 1.5: Extended Field Types
  // =========================================================================
  describe('Extended Field Types', () => {
    const allFieldTypes = [
      'text', 'textarea', 'number', 'date', 'select', 'boolean',
      'email', 'phone', 'url', 'time', 'datetime',
      'radio', 'checkbox', 'switch', 'slider', 'rate',
      'color', 'file', 'image', 'cascader', 'richtext',
    ];

    it('should accept all 21 field types when creating template', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          $queryRaw: jest.fn().mockResolvedValue([{ count: 0n }]),
        });
      });

      const fields = allFieldTypes.map((type, index) => ({
        name: `field_${index}`,
        label: `Field ${index}`,
        type,
        required: false,
      }));

      mockPrisma.template.create.mockImplementation(async (args: any) => ({
        id: args.data.id,
        level: 1,
        number: 'TPL10001',
        title: 'All Types Template',
        fieldsJson: args.data.fieldsJson,
        version: 1.0,
        status: 'active',
      }));

      const result = await service.create(
        { level: 1, title: 'All Types Template', fields },
        'user-1',
      );

      expect(result.fieldsJson).toHaveLength(allFieldTypes.length);
    });

    it('original 6 field types should still be valid (backward compatibility)', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          $queryRaw: jest.fn().mockResolvedValue([{ count: 0n }]),
        });
      });

      const originalTypes = ['text', 'textarea', 'number', 'date', 'select', 'boolean'];
      const fields = originalTypes.map((type, i) => ({
        name: `field_${i}`,
        label: `Field ${i}`,
        type,
        required: true,
      }));

      mockPrisma.template.create.mockImplementation(async (args: any) => ({
        id: args.data.id,
        level: 1,
        number: 'TPL10001',
        title: 'Original Types',
        fieldsJson: args.data.fieldsJson,
        version: 1.0,
      }));

      const result = await service.create(
        { level: 1, title: 'Original Types', fields },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.fieldsJson).toHaveLength(6);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe('Edge Cases', () => {
    it('findOne() should throw BusinessException when template not found', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(BusinessException);
    });

    it('copy() should throw when source template not found', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(null);

      await expect(service.copy('nonexistent', 'user-1')).rejects.toThrow(BusinessException);
    });

    it('update() should throw when template not found', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { title: 'New Title' }, 'admin-1', 'admin'),
      ).rejects.toThrow(BusinessException);
    });

    it('remove() should soft delete (set deletedAt)', async () => {
      mockPrisma.template.findUnique.mockResolvedValue({
        id: '123',
        title: 'To Delete',
        creatorId: 'admin-1',
        deletedAt: null,
      });
      mockPrisma.template.update.mockResolvedValue({ success: true });

      const result = await service.remove('123', 'admin-1', 'admin');

      expect(result.success).toBe(true);
      expect(mockPrisma.template.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('toggleStatus() should toggle active to inactive', async () => {
      mockPrisma.template.findUnique.mockResolvedValue({
        id: '123',
        status: 'active',
        creatorId: 'admin-1',
      });
      mockPrisma.template.update.mockResolvedValue({
        id: '123',
        status: 'inactive',
      });

      const result = await service.toggleStatus('123', 'admin-1', 'admin');
      expect(result.status).toBe('inactive');
    });

    it('toggleStatus() should toggle inactive to active', async () => {
      mockPrisma.template.findUnique.mockResolvedValue({
        id: '123',
        status: 'inactive',
        creatorId: 'admin-1',
      });
      mockPrisma.template.update.mockResolvedValue({
        id: '123',
        status: 'active',
      });

      const result = await service.toggleStatus('123', 'admin-1', 'admin');
      expect(result.status).toBe('active');
    });

    it('findAll() with keyword should search title and number', async () => {
      mockPrisma.template.findMany.mockResolvedValue([]);
      mockPrisma.template.count.mockResolvedValue(0);

      await service.findAll({ keyword: 'test', page: 1, limit: 20 });

      expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'test' } },
              { number: { contains: 'test' } },
            ],
          }),
        }),
      );
    });

    it('findAll() with level filter should filter correctly', async () => {
      mockPrisma.template.findMany.mockResolvedValue([]);
      mockPrisma.template.count.mockResolvedValue(0);

      await service.findAll({ level: 2, page: 1, limit: 20 });

      expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            level: 2,
          }),
        }),
      );
    });
  });

  // =========================================================================
  // SEC-003: Authorization Checks
  // =========================================================================
  describe('Authorization - update()', () => {
    const templateOwnedByUser1 = {
      id: 'tpl-100',
      title: 'User1 Template',
      creatorId: 'user-1',
      status: 'active',
      fieldsJson: [{ name: 'f1', type: 'text' }],
    };

    it('should allow admin to update any template', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateOwnedByUser1);
      mockPrisma.template.update.mockResolvedValue({
        ...templateOwnedByUser1,
        title: 'Updated by Admin',
      });

      const result = await service.update(
        'tpl-100',
        { title: 'Updated by Admin' },
        'admin-1',
        'admin',
      );

      expect(result.title).toBe('Updated by Admin');
    });

    it('should allow leader to update any template', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateOwnedByUser1);
      mockPrisma.template.update.mockResolvedValue({
        ...templateOwnedByUser1,
        title: 'Updated by Leader',
      });

      const result = await service.update(
        'tpl-100',
        { title: 'Updated by Leader' },
        'leader-1',
        'leader',
      );

      expect(result.title).toBe('Updated by Leader');
    });

    it('should allow creator to update own template', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateOwnedByUser1);
      mockPrisma.template.update.mockResolvedValue({
        ...templateOwnedByUser1,
        title: 'Updated by Creator',
      });

      const result = await service.update(
        'tpl-100',
        { title: 'Updated by Creator' },
        'user-1',
        'user',
      );

      expect(result.title).toBe('Updated by Creator');
    });

    it('should reject non-creator regular user from updating', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateOwnedByUser1);

      await expect(
        service.update('tpl-100', { title: 'Hacked' }, 'user-2', 'user'),
      ).rejects.toThrow(BusinessException);

      await expect(
        service.update('tpl-100', { title: 'Hacked' }, 'user-2', 'user'),
      ).rejects.toThrow('您无权修改此模板');
    });
  });

  describe('Authorization - remove()', () => {
    const templateOwnedByUser1 = {
      id: 'tpl-200',
      title: 'User1 Template',
      creatorId: 'user-1',
      status: 'active',
    };

    it('should allow admin to delete any template', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateOwnedByUser1);
      mockPrisma.template.update.mockResolvedValue({ success: true });

      const result = await service.remove('tpl-200', 'admin-1', 'admin');
      expect(result.success).toBe(true);
    });

    it('should allow leader to delete any template', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateOwnedByUser1);
      mockPrisma.template.update.mockResolvedValue({ success: true });

      const result = await service.remove('tpl-200', 'leader-1', 'leader');
      expect(result.success).toBe(true);
    });

    it('should allow creator to delete own template', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateOwnedByUser1);
      mockPrisma.template.update.mockResolvedValue({ success: true });

      const result = await service.remove('tpl-200', 'user-1', 'user');
      expect(result.success).toBe(true);
    });

    it('should reject non-creator regular user from deleting', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateOwnedByUser1);

      await expect(
        service.remove('tpl-200', 'user-2', 'user'),
      ).rejects.toThrow(BusinessException);

      await expect(
        service.remove('tpl-200', 'user-2', 'user'),
      ).rejects.toThrow('您无权删除此模板');
    });
  });

  describe('Authorization - toggleStatus()', () => {
    const templateOwnedByUser1 = {
      id: 'tpl-300',
      title: 'User1 Template',
      creatorId: 'user-1',
      status: 'active',
    };

    it('should allow admin to toggle any template status', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateOwnedByUser1);
      mockPrisma.template.update.mockResolvedValue({
        ...templateOwnedByUser1,
        status: 'inactive',
      });

      const result = await service.toggleStatus('tpl-300', 'admin-1', 'admin');
      expect(result.status).toBe('inactive');
    });

    it('should allow leader to toggle any template status', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateOwnedByUser1);
      mockPrisma.template.update.mockResolvedValue({
        ...templateOwnedByUser1,
        status: 'inactive',
      });

      const result = await service.toggleStatus('tpl-300', 'leader-1', 'leader');
      expect(result.status).toBe('inactive');
    });

    it('should reject regular user from toggling other user template', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateOwnedByUser1);

      await expect(
        service.toggleStatus('tpl-300', 'user-2', 'user'),
      ).rejects.toThrow(BusinessException);

      await expect(
        service.toggleStatus('tpl-300', 'user-2', 'user'),
      ).rejects.toThrow('您无权修改此模板状态');
    });

    it('should allow creator to toggle own template status', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateOwnedByUser1);
      mockPrisma.template.update.mockResolvedValue({
        ...templateOwnedByUser1,
        status: 'inactive',
      });

      const result = await service.toggleStatus('tpl-300', 'user-1', 'user');
      expect(result.status).toBe('inactive');
    });
  });

  describe('Authorization - updateToleranceConfig()', () => {
    const templateWithNumberField = {
      id: 'tpl-400',
      title: 'User1 Template',
      creatorId: 'user-1',
      version: 1.0,
      fieldsJson: [{ name: 'temp', type: 'number' }],
    };

    it('should allow admin to update tolerance config on any template', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateWithNumberField);
      mockPrisma.template.update.mockResolvedValue({
        ...templateWithNumberField,
        version: 1.1,
      });

      const result = await service.updateToleranceConfig(
        'tpl-400',
        { temp: { type: 'range', min: 10, max: 20 } },
        'admin-1',
        'admin',
      );

      expect(result.version).toBe(1.1);
    });

    it('should allow creator to update tolerance config on own template', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateWithNumberField);
      mockPrisma.template.update.mockResolvedValue({
        ...templateWithNumberField,
        version: 1.1,
      });

      const result = await service.updateToleranceConfig(
        'tpl-400',
        { temp: { type: 'range', min: 10, max: 20 } },
        'user-1',
        'user',
      );

      expect(result.version).toBe(1.1);
    });

    it('should reject non-creator regular user from updating tolerance', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(templateWithNumberField);

      await expect(
        service.updateToleranceConfig(
          'tpl-400',
          { temp: { type: 'range', min: 10, max: 20 } },
          'user-2',
          'user',
        ),
      ).rejects.toThrow(BusinessException);

      await expect(
        service.updateToleranceConfig(
          'tpl-400',
          { temp: { type: 'range', min: 10, max: 20 } },
          'user-2',
          'user',
        ),
      ).rejects.toThrow('您无权修改此模板公差配置');
    });
  });
});
