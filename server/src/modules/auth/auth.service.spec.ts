import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  const mockUser = {
    id: 'user-1',
    username: 'admin',
    password: 'hashed-password',
    name: '管理员',
    role: 'admin',
    status: 'active',
    loginAttempts: 0,
    lockedUntil: null,
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('应该登录成功并返回 token', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ username: 'admin', password: '123456' });

      expect(result.token).toBe('mock-token');
      expect(result.user.username).toBe('admin');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        username: 'admin',
        role: 'admin',
      });
    });

    it('用户名不存在时应该抛出 UnauthorizedException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ username: 'unknown', password: '123456' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('密码错误时应该抛出 UnauthorizedException', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ username: 'admin', password: 'wrong' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('账号被禁用时应该抛出 UnauthorizedException', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, status: 'disabled' } as any);

      await expect(service.login({ username: 'admin', password: '123456' }))
        .rejects.toThrow(new UnauthorizedException('账号已被禁用'));
    });

    it('账号被锁定时应该抛出 UnauthorizedException', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 1000 * 60 * 30), // 30 分钟后
      };
      prisma.user.findUnique.mockResolvedValue(lockedUser as any);

      await expect(service.login({ username: 'admin', password: '123456' }))
        .rejects.toThrow(new UnauthorizedException('账号已被锁定'));
    });

    it('密码错误时应该增加登录尝试次数', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      try {
        await service.login({ username: 'admin', password: 'wrong' });
      } catch {
        // 预期抛出异常
      }

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { loginAttempts: 1 },
      });
    });

    it('登录失败 5 次后应该锁定账号', async () => {
      const userWith4Attempts = { ...mockUser, loginAttempts: 4 };
      prisma.user.findUnique.mockResolvedValue(userWith4Attempts as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      try {
        await service.login({ username: 'admin', password: 'wrong' });
      } catch {
        // 预期抛出异常
      }

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          loginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      });
    });
  });

  describe('changePassword', () => {
    it('应该成功修改密码', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      const result = await service.changePassword('user-1', {
        oldPassword: '123456',
        newPassword: 'newpassword',
      });

      expect(result.message).toBe('密码修改成功');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'new-hashed-password' },
      });
    });

    it('用户不存在时应该抛出 BadRequestException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.changePassword('unknown', {
        oldPassword: '123456',
        newPassword: 'newpassword',
      })).rejects.toThrow(BadRequestException);
    });

    it('旧密码错误时应该抛出 BadRequestException', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword('user-1', {
        oldPassword: 'wrong',
        newPassword: 'newpassword',
      })).rejects.toThrow(new BadRequestException('旧密码错误'));
    });
  });
});
