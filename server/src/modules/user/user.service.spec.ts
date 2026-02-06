import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let prisma: any;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    password: 'hashed-password',
    name: '测试用户',
    role: 'user',
    status: 'active',
    departmentId: 'dept-1',
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('应该返回用户列表', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20);

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('应该支持关键字搜索', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);
      prisma.user.count.mockResolvedValue(1);

      await service.findAll(1, 20, 'test');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'test' } },
              { username: { contains: 'test' } },
            ],
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('应该返回用户', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('user-1');

      expect(result).toEqual(mockUser);
    });

    it('用户不存在时应该抛出 NotFoundException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('应该成功创建用户', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.create({
        username: 'newuser',
        password: '123456',
        name: '新用户',
        role: 'user',
      });

      expect(result).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('用户名已存在时应该抛出 BusinessException', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.create({
        username: 'testuser',
        password: '123456',
        name: '新用户',
        role: 'user',
      })).rejects.toThrow(BusinessException);
    });
  });

  describe('update', () => {
    it('应该成功更新用户', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, name: '更新后' });

      const result = await service.update('user-1', { name: '更新后' });

      expect(result.name).toBe('更新后');
    });
  });

  describe('remove', () => {
    it('应该软删除用户', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, deletedAt: new Date() });

      const result = await service.remove('user-1');

      expect(result.deletedAt).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('resetPassword', () => {
    it('应该重置密码', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      const result = await service.resetPassword('user-1');

      expect(result.message).toBe('密码已重置为默认密码');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          password: 'new-hashed-password',
          loginAttempts: 0,
          lockedUntil: null,
        },
      });
    });
  });
});
