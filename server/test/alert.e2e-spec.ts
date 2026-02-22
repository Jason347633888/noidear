import { loginForTest } from "./test-helpers";
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Alert API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let ruleId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    const loginData = await loginForTest(
      app,
      process.env.TEST_USERNAME || 'admin',
      process.env.TEST_PASSWORD || '12345678',
    );
    authToken = loginData.token;
  });

  afterAll(async () => {
    await prisma.alertHistory.deleteMany({});
    await prisma.alertRule.deleteMany({
      where: { name: { contains: 'Test' } },
    });

    await app.close();
  });

  describe('POST /api/v1/alerts/rules', () => {
    it('should create an alert rule', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/alerts/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Alert Rule',
          metricName: 'cpu_usage',
          condition: '>',
          threshold: 80,
          severity: 'warning',
          enabled: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Alert Rule');
      ruleId = response.body.id.toString();
    });
  });

  describe('GET /api/v1/alerts/rules', () => {
    it('should get all alert rules', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/alerts/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/v1/alerts/rules/:id/toggle', () => {
    it('should toggle alert rule status', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/alerts/rules/${ruleId}/toggle`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.enabled).toBe(false);
    });
  });

  describe('POST /api/v1/alerts/history/query', () => {
    it('should query alert history', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/alerts/history/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });
  });
});
