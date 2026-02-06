import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DeviationModule } from './deviation.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('DeviationAnalyticsController (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DeviationModule, PrismaModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /deviation-analytics/trend', () => {
    it('应该返回 400 当缺少必需参数', async () => {
      const response = await request(app.getHttpServer())
        .get('/deviation-analytics/trend')
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('应该返回趋势数据', async () => {
      const response = await request(app.getHttpServer())
        .get('/deviation-analytics/trend')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          granularity: 'day',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /deviation-analytics/field-distribution', () => {
    it('应该返回字段分布数据', async () => {
      const response = await request(app.getHttpServer())
        .get('/deviation-analytics/field-distribution')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该支持日期范围筛选', async () => {
      const response = await request(app.getHttpServer())
        .get('/deviation-analytics/field-distribution')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /deviation-analytics/rate-by-department', () => {
    it('应该返回部门偏离率数据', async () => {
      const response = await request(app.getHttpServer())
        .get('/deviation-analytics/rate-by-department')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /deviation-analytics/rate-by-template', () => {
    it('应该返回模板偏离率数据', async () => {
      const response = await request(app.getHttpServer())
        .get('/deviation-analytics/rate-by-template')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /deviation-analytics/reason-wordcloud', () => {
    it('应该返回词云数据', async () => {
      const response = await request(app.getHttpServer())
        .get('/deviation-analytics/reason-wordcloud')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
