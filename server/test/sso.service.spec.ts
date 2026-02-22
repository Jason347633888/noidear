import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SsoService } from '../src/modules/auth/sso.service';
import { PrismaService } from '../src/prisma/prisma.service';

// Mock ldapjs 模块（真实认证流程的单元测试替身）
jest.mock('ldapjs', () => {
  const makeSearchResult = (hasEntry: boolean) => ({
    on: jest.fn((event: string, cb: (...args: any[]) => void) => {
      if (hasEntry && event === 'searchEntry') {
        cb({ dn: { toString: () => 'CN=testuser,DC=test,DC=com' } });
      }
      if (event === 'end') cb();
    }),
  });

  const mockClient = {
    bind: jest.fn((_dn: string, _pw: string, cb: (err: any) => void) => cb(null)),
    search: jest.fn((_base: string, _opts: any, cb: (err: any, res: any) => void) => {
      cb(null, makeSearchResult(true));
    }),
    destroy: jest.fn(),
    __makeSearchResult: makeSearchResult,
  };

  return {
    createClient: jest.fn(() => mockClient),
    __mockClient: mockClient,
  };
});

const mockUser = {
  id: 'user-id-001',
  username: 'google_abc12345',
  name: 'Google 用户',
  role: 'user',
  status: 'active',
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

describe('SsoService', () => {
  let service: SsoService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SsoService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<SsoService>(SsoService);
  });

  describe('oauth2Login', () => {
    it('新用户首次登录时自动创建账号并返回 token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const oauthUser = {
        provider: 'google',
        providerId: 'abc12345',
        username: 'google_abc12345',
        name: 'Google 用户',
      };

      const result = await service.oauth2Login(oauthUser);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ username: 'google_abc12345', role: 'user' }),
        }),
      );
      expect(result.token).toBe('mock.jwt.token');
      expect(result.user.username).toBe('google_abc12345');
    });

    it('已有用户登录时不重复创建，直接返回 token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const oauthUser = { provider: 'google', providerId: 'abc12345', username: 'google_abc12345', name: 'Google 用户' };
      const result = await service.oauth2Login(oauthUser);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(result.user.id).toBe('user-id-001');
    });
  });

  describe('ldapLogin', () => {
    const LDAP_URL_KEY = 'LDAP_URL';
    const LDAP_BIND_DN_KEY = 'LDAP_BIND_DN';
    const LDAP_BIND_PASS_KEY = 'LDAP_BIND_PASSWORD';
    const LDAP_BASE_DN_KEY = 'LDAP_BASE_DN';

    beforeEach(() => {
      process.env[LDAP_URL_KEY] = 'ldap://ldap-test-server:389';
      process.env[LDAP_BIND_DN_KEY] = 'CN=svc,DC=test,DC=com';
      process.env[LDAP_BIND_PASS_KEY] = 'test-placeholder-pass';
      process.env[LDAP_BASE_DN_KEY] = 'DC=test,DC=com';
    });

    afterEach(() => {
      [LDAP_URL_KEY, LDAP_BIND_DN_KEY, LDAP_BIND_PASS_KEY, LDAP_BASE_DN_KEY].forEach(
        (k) => delete process.env[k],
      );
    });

    it('LDAP_URL 未配置时应抛出 BadRequestException', async () => {
      delete process.env[LDAP_URL_KEY];
      await expect(service.ldapLogin('admin', 'any')).rejects.toThrow(BadRequestException);
    });

    it('LDAP 认证成功时应返回 token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.ldapLogin('admin', 'valid-password');

      expect(result.token).toBe('mock.jwt.token');
      expect(result.user.id).toBe('user-id-001');
    });

    it('LDAP 首次登录时自动创建本地账号', async () => {
      const newUser = { id: 'new-id', username: 'admin', name: 'admin', role: 'user', status: 'active' };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(newUser);

      const result = await service.ldapLogin('admin', 'valid-password');

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ username: 'admin', role: 'user' }),
        }),
      );
      expect(result.token).toBe('mock.jwt.token');
    });

    it('LDAP bind 失败时应抛出 UnauthorizedException', async () => {
      const ldapMod = require('ldapjs');
      ldapMod.__mockClient.bind.mockImplementationOnce(
        (_dn: string, _pw: string, cb: (err: any) => void) => cb(new Error('Invalid credentials')),
      );

      await expect(service.ldapLogin('admin', 'wrong-pass')).rejects.toThrow(UnauthorizedException);
    });

    it('搜索不到用户时应抛出 UnauthorizedException', async () => {
      const ldapMod = require('ldapjs');
      const emptyResult = {
        on: jest.fn((event: string, cb: (...args: any[]) => void) => {
          if (event === 'end') cb();
        }),
      };
      ldapMod.__mockClient.search.mockImplementationOnce(
        (_base: string, _opts: any, cb: (err: any, res: any) => void) => cb(null, emptyResult),
      );

      await expect(service.ldapLogin('no-such-user', 'pass')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getOAuth2RedirectUrl', () => {
    it('不支持的 provider 应抛出 BadRequestException', () => {
      expect(() => service.getOAuth2RedirectUrl('unknown')).toThrow(BadRequestException);
    });

    it('支持的 provider 且 URL 已配置时应返回 URL', () => {
      const origUrl = process.env.GOOGLE_AUTH_URL;
      process.env.GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/auth';

      const url = service.getOAuth2RedirectUrl('google');
      expect(url).toBe('https://accounts.google.com/o/oauth2/auth');

      if (origUrl === undefined) delete process.env.GOOGLE_AUTH_URL;
      else process.env.GOOGLE_AUTH_URL = origUrl;
    });
  });
});
