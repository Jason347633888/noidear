import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SsoService } from '../src/modules/auth/sso.service';
import { PrismaService } from '../src/prisma/prisma.service';

const mockUser = {
  id: 'user-id-001',
  username: 'google_abc12345',
  name: 'Google 用户',
  role: 'user',
  status: 'active',
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

describe('SsoService', () => {
  let service: SsoService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SsoService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<SsoService>(SsoService);
  });

  describe('oauth2Login', () => {
    it('新用户首次登录时自动创建账号并返回 token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const oauthUser = {
        provider: 'google',
        providerId: 'abc12345',
        username: 'google_abc12345',
        name: 'Google 用户',
      };

      const result = await service.oauth2Login(oauthUser);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: 'google_abc12345',
            name: 'Google 用户',
            role: 'user',
          }),
        }),
      );
      expect(result.token).toBe('mock.jwt.token');
      expect(result.user.username).toBe('google_abc12345');
    });

    it('已有用户登录时不重复创建，直接返回 token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const oauthUser = {
        provider: 'google',
        providerId: 'abc12345',
        username: 'google_abc12345',
        name: 'Google 用户',
      };

      const result = await service.oauth2Login(oauthUser);

      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
      expect(result.token).toBe('mock.jwt.token');
      expect(result.user.id).toBe('user-id-001');
    });
  });

  describe('ldapLogin', () => {
    const originalEnv = process.env.LDAP_URL;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.LDAP_URL;
      } else {
        process.env.LDAP_URL = originalEnv;
      }
    });

    it('LDAP_URL 未配置时应抛出 BadRequestException', async () => {
      delete process.env.LDAP_URL;

      await expect(service.ldapLogin('admin', 'anyvalue')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('LDAP_URL 已配置时，凭证过短应抛出 UnauthorizedException', async () => {
      process.env.LDAP_URL = 'ldap://localhost:389';
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      await expect(service.ldapLogin('admin', 'ab')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('LDAP_URL 已配置且凭证有效时应返回 token', async () => {
      process.env.LDAP_URL = 'ldap://localhost:389';
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.ldapLogin('admin', 'validcredential');

      expect(result.token).toBe('mock.jwt.token');
    });
  });

  describe('getOAuth2RedirectUrl', () => {
    it('不支持的 provider 应抛出 BadRequestException', () => {
      expect(() => service.getOAuth2RedirectUrl('unknown')).toThrow(
        BadRequestException,
      );
    });

    it('支持的 provider 且 URL 已配置时应返回 URL', () => {
      const originalUrl = process.env.GOOGLE_AUTH_URL;
      process.env.GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/auth';

      const url = service.getOAuth2RedirectUrl('google');
      expect(url).toBe('https://accounts.google.com/o/oauth2/auth');

      if (originalUrl === undefined) {
        delete process.env.GOOGLE_AUTH_URL;
      } else {
        process.env.GOOGLE_AUTH_URL = originalUrl;
      }
    });
  });
});
