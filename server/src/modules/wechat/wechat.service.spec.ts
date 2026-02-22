import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WechatService } from './wechat.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WechatMessageType } from './dto';
import { BusinessException } from '../../common/exceptions/business.exception';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('WechatService', () => {
  let service: WechatService;
  let prisma: any;

  const mockMessage = {
    id: 'msg-1',
    type: WechatMessageType.TODO_REMIND,
    templateId: 'tpl-todo',
    touser: 'openid-123',
    data: { thing1: { value: '待办标题' } },
    status: 'pending',
    retries: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      wechatMessage: {
        create: jest.fn().mockResolvedValue(mockMessage),
        update: jest.fn().mockResolvedValue({ ...mockMessage, status: 'sent' }),
        findMany: jest.fn().mockResolvedValue([mockMessage]),
        count: jest.fn().mockResolvedValue(1),
      },
    };

    const configValues: Record<string, string> = {
      WECHAT_APP_ID: 'test-app-id',
      WECHAT_APP_SECRET: 'test-app-secret',
      WECHAT_TPL_TODO_REMIND: 'tpl-todo',
      WECHAT_TPL_EXPIRY_WARNING: 'tpl-expiry',
      WECHAT_TPL_APPROVAL_NOTICE: 'tpl-approval',
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => configValues[key] ?? defaultValue ?? ''),
      getOrThrow: jest.fn((key: string) => {
        if (configValues[key]) return configValues[key];
        throw new Error(`Missing ${key}`);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WechatService>(WechatService);
  });

  describe('sendSubscribeMessage', () => {
    it('should create a message record and attempt to send', async () => {
      // Mock getAccessToken
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ access_token: 'test-token', expires_in: 7200 }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
        });

      const dto = {
        type: WechatMessageType.TODO_REMIND,
        templateId: 'tpl-todo',
        touser: 'openid-123',
        data: { thing1: { value: '待办标题' } },
      };

      const result = await service.sendSubscribeMessage(dto);

      expect(prisma.wechatMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'todo_remind',
          templateId: 'tpl-todo',
          touser: 'openid-123',
          status: 'pending',
        }),
      });
      expect(result.id).toBe('msg-1');
      expect(result.status).toBe('sent');
    });

    it('should retry on failure and eventually succeed', async () => {
      // First attempt fails, second gets new token and succeeds
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ access_token: 'token-1', expires_in: 7200 }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ errcode: -1, errmsg: 'system error' }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
        });

      const dto = {
        type: WechatMessageType.TODO_REMIND,
        templateId: 'tpl-todo',
        touser: 'openid-123',
        data: { thing1: { value: '待办标题' } },
      };

      const result = await service.sendSubscribeMessage(dto);

      expect(result.status).toBe('sent');
      // Should have been called at least twice for the message update (retry count update + final sent)
      expect(prisma.wechatMessage.update).toHaveBeenCalled();
    });

    it('should mark as failed after all retries exhausted', async () => {
      prisma.wechatMessage.update.mockResolvedValue({ ...mockMessage, status: 'failed' });

      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ access_token: 'token-1', expires_in: 7200 }),
        })
        .mockResolvedValue({
          json: () => Promise.resolve({ errcode: -1, errmsg: 'system error' }),
        });

      const dto = {
        type: WechatMessageType.TODO_REMIND,
        templateId: 'tpl-todo',
        touser: 'openid-123',
        data: { thing1: { value: '待办标题' } },
      };

      const result = await service.sendSubscribeMessage(dto);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });
  });

  describe('getAccessToken', () => {
    it('should fetch access token from WeChat API', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ access_token: 'new-token', expires_in: 7200 }),
      });

      const token = await service.getAccessToken();

      expect(token).toBe('new-token');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.weixin.qq.com/cgi-bin/token'),
      );
    });

    it('should cache access token', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ access_token: 'cached-token', expires_in: 7200 }),
      });

      // First call fetches
      const token1 = await service.getAccessToken();
      // Second call should use cache
      const token2 = await service.getAccessToken();

      expect(token1).toBe('cached-token');
      expect(token2).toBe('cached-token');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw BusinessException when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ errcode: 40013, errmsg: 'invalid appid' }),
      });

      await expect(service.getAccessToken()).rejects.toThrow(BusinessException);
    });
  });

  describe('callWechatApi', () => {
    it('should send subscribe message via WeChat API', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ access_token: 'test-token', expires_in: 7200 }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ errcode: 0, errmsg: 'ok' }),
        });

      const dto = {
        type: WechatMessageType.TODO_REMIND,
        templateId: 'tpl-todo',
        touser: 'openid-123',
        data: { thing1: { value: 'test' } },
      };

      await expect(service.callWechatApi(dto)).resolves.toBeUndefined();
    });

    it('should throw BusinessException when WeChat API returns error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ access_token: 'test-token', expires_in: 7200 }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ errcode: 43101, errmsg: 'user refuse' }),
        });

      const dto = {
        type: WechatMessageType.TODO_REMIND,
        templateId: 'tpl-todo',
        touser: 'openid-123',
        data: { thing1: { value: 'test' } },
      };

      await expect(service.callWechatApi(dto)).rejects.toThrow(BusinessException);
    });
  });

  describe('getTemplates', () => {
    it('should return configured message templates', () => {
      const templates = service.getTemplates();

      expect(templates).toHaveLength(3);
      expect(templates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'todo_remind',
            templateId: 'tpl-todo',
            title: '待办提醒',
          }),
          expect.objectContaining({
            type: 'expiry_warning',
            templateId: 'tpl-expiry',
            title: '临期预警',
          }),
          expect.objectContaining({
            type: 'approval_notice',
            templateId: 'tpl-approval',
            title: '审批通知',
          }),
        ]),
      );
    });
  });

  describe('getMessageHistory', () => {
    it('should return paginated message history', async () => {
      const result = await service.getMessageHistory('openid-123', 1, 20);

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should query by touser', async () => {
      await service.getMessageHistory('openid-456');

      expect(prisma.wechatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { touser: 'openid-456' },
        }),
      );
    });

    it('should use default pagination when not provided', async () => {
      await service.getMessageHistory('openid-123');

      expect(prisma.wechatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should calculate correct offset for pagination', async () => {
      await service.getMessageHistory('openid-123', 3, 10);

      expect(prisma.wechatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });
});
