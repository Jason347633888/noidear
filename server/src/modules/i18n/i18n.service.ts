import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import * as fs from 'fs';
import * as path from 'path';

const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
type Locale = typeof SUPPORTED_LOCALES[number];

@Injectable()
export class I18nService {
  private readonly logger = new Logger(I18nService.name);
  private readonly CACHE_TTL = 3600;
  private readonly I18N_DIR = path.join(process.cwd(), 'i18n');

  constructor(private readonly redis: RedisService) {}

  async getTranslations(locale: string): Promise<Record<string, unknown>> {
    this.validateLocale(locale);
    const cacheKey = `i18n:${locale}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    const translations = this.loadTranslationFile(locale as Locale);
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(translations));
    return translations;
  }

  async updateTranslations(locale: string, translations: Record<string, unknown>) {
    this.validateLocale(locale);
    const filePath = this.getFilePath(locale as Locale);
    const current = this.loadTranslationFile(locale as Locale);
    const merged = mergeDeep(current, translations);
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
    await this.redis.del(`i18n:${locale}`);
    this.logger.log(`翻译文件更新: ${locale}`);
    return { success: true, locale, message: '翻译文件已更新' };
  }

  getSupportedLocales() {
    return { locales: [...SUPPORTED_LOCALES] };
  }

  private validateLocale(locale: string) {
    if (!SUPPORTED_LOCALES.includes(locale as Locale)) {
      throw new BadRequestException(`不支持的语言：${locale}。支持：${SUPPORTED_LOCALES.join(', ')}`);
    }
  }

  private getFilePath(locale: Locale): string {
    return path.join(this.I18N_DIR, `${locale}.json`);
  }

  private loadTranslationFile(locale: Locale): Record<string, unknown> {
    const filePath = this.getFilePath(locale);
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`翻译文件不存在: ${filePath}`);
      return {};
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function mergeEntry(targetVal: unknown, sourceVal: unknown): unknown {
  if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
    return mergeDeep(targetVal, sourceVal);
  }
  return sourceVal;
}

function mergeDeep(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    result[key] = mergeEntry(target[key], source[key]);
  }
  return result;
}
