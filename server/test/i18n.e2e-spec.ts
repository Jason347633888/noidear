import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('I18n (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/i18n/locales', () => {
    it('should return supported locales', () => {
      return request(app.getHttpServer())
        .get('/api/v1/i18n/locales')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('locales');
          expect(Array.isArray(res.body.locales)).toBe(true);
          expect(res.body.locales).toContain('zh-CN');
          expect(res.body.locales).toContain('en-US');
        });
    });
  });

  describe('GET /api/v1/i18n/translations/:locale', () => {
    it('should return zh-CN translations', () => {
      return request(app.getHttpServer())
        .get('/api/v1/i18n/translations/zh-CN')
        .expect(200)
        .expect((res) => {
          expect(typeof res.body).toBe('object');
        });
    });

    it('should return en-US translations', () => {
      return request(app.getHttpServer())
        .get('/api/v1/i18n/translations/en-US')
        .expect(200)
        .expect((res) => {
          expect(typeof res.body).toBe('object');
        });
    });

    it('should return 400 for unsupported locale', () => {
      return request(app.getHttpServer())
        .get('/api/v1/i18n/translations/ja-JP')
        .expect(400);
    });
  });
});
