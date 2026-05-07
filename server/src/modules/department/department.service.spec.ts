import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DepartmentService', () => {
  let service: DepartmentService;
  let prisma: any;

  const mockManager = {
    id: 'u-1',
    username: 'leader.zhang',
    name: '张三',
    status: 'active',
    roleId: 'r-leader',
    roleObj: { id: 'r-leader', code: 'leader', name: '部门负责人' },
  };

  const mockDepartment = {
    id: 'dept-1',
    code: 'QA',
    name: '品质部',
    parentId: null,
    managerId: 'u-1',
    manager: mockManager,
    status: 'active',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      department: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DepartmentService>(DepartmentService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('应该返回部门列表并包含 manager 关系', async () => {
      prisma.department.findMany.mockResolvedValue([mockDepartment]);
      prisma.department.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.objectContaining({ manager: expect.anything() }) }),
      );
    });
  });

  describe('create', () => {
    it('应该持久化 managerId', async () => {
      prisma.department.create.mockResolvedValue(mockDepartment);

      await service.create({ code: 'QA', name: '品质部', managerId: 'u-1' });

      expect(prisma.department.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ managerId: 'u-1' }),
        }),
      );
    });

    it('managerId 为空时应设为 null', async () => {
      prisma.department.create.mockResolvedValue({ ...mockDepartment, managerId: null, manager: null });

      await service.create({ code: 'RD', name: '研发部' });

      expect(prisma.department.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ managerId: null }),
        }),
      );
    });
  });

  describe('update', () => {
    it('应该持久化 managerId', async () => {
      prisma.department.findUnique.mockResolvedValue(mockDepartment);
      prisma.department.update.mockResolvedValue(mockDepartment);

      await service.update('dept-1', { managerId: 'u-2' });

      expect(prisma.department.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ managerId: 'u-2' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('应该返回部门详情', async () => {
      prisma.department.findUnique.mockResolvedValue(mockDepartment);

      const result = await service.findOne('dept-1');

      expect(result).toEqual(mockDepartment);
    });

    it('部门不存在时应该抛出 NotFoundException', async () => {
      prisma.department.findUnique.mockResolvedValue(null);

      await expect(service.findOne('unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
