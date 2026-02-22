import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { I18nService } from '../src/modules/i18n/i18n.service';
import { RedisService } from '../src/modules/redis/redis.service';
import * as fs from 'fs';

jest.mock('fs');

const mockRedisService = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
};

const mockTranslations = {
  'common.ok': '确定',
  'common.cancel': '取消',
};

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        I18nService,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<I18nService>(I18nService);
  });

  describe('getSupportedLocales', () => {
    it('应返回支持的语言列表', () => {
      const result = service.getSupportedLocales();
      expect(result.locales).toContain('zh-CN');
      expect(result.locales).toContain('en-US');
    });
  });

  describe('getTranslations', () => {
    it('命中缓存时直接返回，不读文件', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockTranslations));

      const result = await service.getTranslations('zh-CN');

      expect(result).toEqual(mockTranslations);
      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(mockRedisService.setex).not.toHaveBeenCalled();
    });

    it('未命中缓存时读文件并写入缓存', async () => {
      mockRedisService.get.mockResolvedValue(null);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockTranslations),
      );

      const result = await service.getTranslations('zh-CN');

      expect(result).toEqual(mockTranslations);
      expect(mockRedisService.setex).toHaveBeenCalledWith(
        'i18n:zh-CN',
        expect.any(Number),
        JSON.stringify(mockTranslations),
      );
    });

    it('文件不存在时返回空对象', async () => {
      mockRedisService.get.mockResolvedValue(null);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await service.getTranslations('en-US');

      expect(result).toEqual({});
    });

    it('不支持的语言应抛出 BadRequestException', async () => {
      await expect(service.getTranslations('fr-FR')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateTranslations', () => {
    it('应合并翻译并写入文件，删除缓存', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockTranslations),
      );
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      mockRedisService.del.mockResolvedValue(1);

      const newTranslations = { 'common.save': '保存' };
      const result = await service.updateTranslations('zh-CN', newTranslations);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('zh-CN.json'),
        expect.stringContaining('"common.save"'),
        'utf-8',
      );
      expect(mockRedisService.del).toHaveBeenCalledWith('i18n:zh-CN');
      expect(result).toMatchObject({ success: true, locale: 'zh-CN' });
    });

    it('不支持的语言应抛出 BadRequestException', async () => {
      await expect(
        service.updateTranslations('de-DE', { key: 'value' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
