import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { loginForTest, getData } from './test-helpers';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('Health API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    const loginData = await loginForTest(
      app,
      process.env.TEST_USERNAME || 'admin',
      process.env.TEST_PASSWORD || '12345678',
    );
    authToken = loginData.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('should return overall system health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = getData(response.body);
      expect(body).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(401);
    });
  });

  describe('GET /api/v1/health/postgres', () => {
    it('should return PostgreSQL health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/postgres')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = getData(response.body);
      expect(body).toHaveProperty('status');
      expect(['healthy', 'unhealthy']).toContain(body.status);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/health/postgres')
        .expect(401);
    });
  });

  describe('GET /api/v1/health/redis', () => {
    it('should return Redis health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/redis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = getData(response.body);
      expect(body).toHaveProperty('status');
      expect(['healthy', 'unhealthy']).toContain(body.status);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/health/redis')
        .expect(401);
    });
  });

  describe('GET /api/v1/health/minio', () => {
    it('should return MinIO health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/minio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = getData(response.body);
      expect(body).toHaveProperty('status');
      expect(['healthy', 'unhealthy']).toContain(body.status);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/health/minio')
        .expect(401);
    });
  });

  describe('GET /api/v1/health/disk', () => {
    it('should return disk and memory health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/disk')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = getData(response.body);
      expect(body).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/health/disk')
        .expect(401);
    });
  });
});
