import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RoleService } from '../src/modules/role/role.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { QueryRoleDto } from '../src/modules/role/dto/query-role.dto';
import { REDIS_CLIENT } from '../src/modules/redis/redis.constants';

describe('RoleService', () => {
  let service: RoleService;

  const mockPrismaService: any = {
    role: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  mockPrismaService.$transaction = jest.fn((callback: any) => callback(mockPrismaService));

  const mockRedisClient = {
    del: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: REDIS_CLIENT, useValue: mockRedisClient },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('应该返回角色列表（分页）', async () => {
      const query: QueryRoleDto = {
        page: 1,
        limit: 10,
        keyword: '测试',
      };

      const mockRoles = [
        { id: 'role-1', code: 'test1', name: '测试角色1' },
        { id: 'role-2', code: 'test2', name: '测试角色2' },
      ];

      mockPrismaService.role.count.mockResolvedValue(2);
      mockPrismaService.role.findMany.mockResolvedValue(mockRoles);

      const result = await service.findAll(query);

      expect(result).toEqual({
        list: mockRoles,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      expect(mockPrismaService.role.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [
            { code: { contains: query.keyword, mode: 'insensitive' } },
            { name: { contains: query.keyword, mode: 'insensitive' } },
          ],
        },
      });

      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [
            { code: { contains: query.keyword, mode: 'insensitive' } },
            { name: { contains: query.keyword, mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('应该支持无关键词查询', async () => {
      const query: QueryRoleDto = {
        page: 1,
        limit: 20,
      };

      mockPrismaService.role.count.mockResolvedValue(0);
      mockPrismaService.role.findMany.mockResolvedValue([]);

      const result = await service.findAll(query);

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('应该返回角色详情', async () => {
      const roleId = 'role-1';
      const mockRole = {
        id: roleId,
        code: 'admin',
        name: '管理员',
        description: '系统管理员',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.role.findFirst.mockResolvedValue(mockRole);

      const result = await service.findOne(roleId);

      expect(result).toEqual(mockRole);
      expect(mockPrismaService.role.findFirst).toHaveBeenCalledWith({
        where: { id: roleId, deletedAt: null },
      });
    });

    it('应该在角色不存在时抛出异常', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('应该在角色已删除时抛出异常', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(service.findOne('role-1')).rejects.toThrow(NotFoundException);
    });
  });

});
