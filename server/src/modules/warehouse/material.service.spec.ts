import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { MaterialService } from './material.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as dayjs from 'dayjs';

describe('MaterialService', () => {
  let service: MaterialService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialService,
        {
          provide: PrismaService,
          useValue: {
            material: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MaterialService>(MaterialService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create material successfully', async () => {
      // Arrange
      const createDto = {
        materialCode: 'MAT-001',
        name: '面粉',
        specification: '25kg/袋',
        unit: 'kg',
        categoryId: 'cat-001',
        shelfLife: 180,
        safetyStock: 100,
      };

      const mockMaterial = {
        id: 'material-001',
        ...createDto,
        customFields: null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.spyOn(prisma.material, 'create').mockResolvedValue(mockMaterial as any);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockMaterial);
      expect(prisma.material.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw BadRequestException if materialCode already exists', async () => {
      // Arrange
      const createDto = {
        materialCode: 'MAT-001',
        name: '面粉',
        categoryId: 'cat-001',
      };

      jest.spyOn(prisma.material, 'create').mockRejectedValue({
        code: 'P2002',
        meta: { target: ['materialCode'] },
      });

      // Act & Assert
      await expect(service.create(createDto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated materials', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
      };

      const mockMaterials = [
        {
          id: 'material-001',
          materialCode: 'MAT-001',
          name: '面粉',
          status: 'active',
        },
        {
          id: 'material-002',
          materialCode: 'MAT-002',
          name: '鸡蛋',
          status: 'active',
        },
      ];

      jest.spyOn(prisma.material, 'findMany').mockResolvedValue(mockMaterials as any);
      jest.spyOn(prisma.material, 'count').mockResolvedValue(2);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toEqual({
        data: mockMaterials,
        total: 2,
        page: 1,
        limit: 10,
      });
      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        skip: 0,
        take: 10,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should support search by name or materialCode', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
        search: '面粉',
      };

      const mockMaterials = [
        {
          id: 'material-001',
          materialCode: 'MAT-001',
          name: '面粉',
          status: 'active',
        },
      ];

      jest.spyOn(prisma.material, 'findMany').mockResolvedValue(mockMaterials as any);
      jest.spyOn(prisma.material, 'count').mockResolvedValue(1);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: '面粉' } },
            { materialCode: { contains: '面粉' } },
          ],
        },
        skip: 0,
        take: 10,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should support filter by categoryId', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
        categoryId: 'cat-001',
      };

      jest.spyOn(prisma.material, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.material, 'count').mockResolvedValue(0);

      // Act
      await service.findAll(query);

      // Assert
      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          categoryId: 'cat-001',
        },
        skip: 0,
        take: 10,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should support filter by status', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
        status: 'active',
      };

      jest.spyOn(prisma.material, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.material, 'count').mockResolvedValue(0);

      // Act
      await service.findAll(query);

      // Assert
      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          status: 'active',
        },
        skip: 0,
        take: 10,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return material by id', async () => {
      // Arrange
      const mockMaterial = {
        id: 'material-001',
        materialCode: 'MAT-001',
        name: '面粉',
        status: 'active',
      };

      jest.spyOn(prisma.material, 'findUnique').mockResolvedValue(mockMaterial as any);

      // Act
      const result = await service.findOne('material-001');

      // Assert
      expect(result).toEqual(mockMaterial);
      expect(prisma.material.findUnique).toHaveBeenCalledWith({
        where: { id: 'material-001' },
        include: { category: true },
      });
    });

    it('should throw NotFoundException if material not found', async () => {
      // Arrange
      jest.spyOn(prisma.material, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if material is deleted', async () => {
      // Arrange
      const mockMaterial = {
        id: 'material-001',
        deletedAt: new Date(),
      };

      jest.spyOn(prisma.material, 'findUnique').mockResolvedValue(mockMaterial as any);

      // Act & Assert
      await expect(service.findOne('material-001')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update material successfully', async () => {
      // Arrange
      const updateDto = {
        name: '面粉（更新）',
        specification: '50kg/袋',
      };

      const mockMaterial = {
        id: 'material-001',
        materialCode: 'MAT-001',
        name: '面粉（更新）',
        specification: '50kg/袋',
        status: 'active',
        deletedAt: null,
      };

      jest.spyOn(prisma.material, 'findUnique').mockResolvedValue({ deletedAt: null } as any);
      jest.spyOn(prisma.material, 'update').mockResolvedValue(mockMaterial as any);

      // Act
      const result = await service.update('material-001', updateDto);

      // Assert
      expect(result).toEqual(mockMaterial);
      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: 'material-001' },
        data: updateDto,
      });
    });

    it('should throw NotFoundException if material not found', async () => {
      // Arrange
      jest.spyOn(prisma.material, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('invalid-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete material successfully', async () => {
      // Arrange
      const mockMaterial = {
        id: 'material-001',
        deletedAt: null,
      };

      const mockUpdatedMaterial = {
        id: 'material-001',
        deletedAt: new Date(),
      };

      jest.spyOn(prisma.material, 'findUnique').mockResolvedValue(mockMaterial as any);
      jest.spyOn(prisma.material, 'update').mockResolvedValue(mockUpdatedMaterial as any);

      // Act
      await service.remove('material-001');

      // Assert
      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: 'material-001' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if material not found', async () => {
      // Arrange
      jest.spyOn(prisma.material, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if material already deleted', async () => {
      // Arrange
      const mockMaterial = {
        id: 'material-001',
        deletedAt: new Date(),
      };

      jest.spyOn(prisma.material, 'findUnique').mockResolvedValue(mockMaterial as any);

      // Act & Assert
      await expect(service.remove('material-001')).rejects.toThrow(NotFoundException);
    });
  });
});
