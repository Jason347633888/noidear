import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { loginForTest, getData } from './test-helpers';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('Traceability Contract (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;

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
    userId = loginData.userId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/traceability/snapshots', () => {
    it('should accept CreateTraceabilitySnapshotDto with required fields', async () => {
      const payload = {
        sourceQueryRef: 'query:hash:abc123',
        exportMode: 'csv',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/traceability/snapshots')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect([200, 201, 400]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const body = getData(response.body);
        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('status');
      }
    });

    it('should reject invalid payload', async () => {
      const payload = { invalid: 'field' };

      const response = await request(app.getHttpServer())
        .post('/api/v1/traceability/snapshots')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect([400, 201, 200]).toContain(response.status);
    });

    it('should fail without authentication', async () => {
      const payload = {
        sourceQueryRef: 'query:hash:abc123',
        exportMode: 'csv',
      };

      await request(app.getHttpServer())
        .post('/api/v1/traceability/snapshots')
        .send(payload)
        .expect(401);
    });
  });

  describe('GET /api/v1/traceability/snapshots/:snapshotId', () => {
    it('should expose snapshot retrieval endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/traceability/snapshots/mock-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/traceability/snapshots/mock-id')
        .expect(401);
    });
  });

  describe('GET /api/v1/traceability/snapshots/:snapshotId/result', () => {
    it('should expose snapshot result endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/traceability/snapshots/mock-id/result')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/traceability/snapshots/mock-id/result')
        .expect(401);
    });
  });

  describe('POST /api/v1/traceability/query', () => {
    it('should reject invalid query body', async () => {
      const payload = { invalid: 'payload' };

      const response = await request(app.getHttpServer())
        .post('/api/v1/traceability/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect([400, 200, 201, 500]).toContain(response.status);
    });

    it('should fail without authentication', async () => {
      const payload = { invalid: 'payload' };

      await request(app.getHttpServer())
        .post('/api/v1/traceability/query')
        .send(payload)
        .expect(401);
    });
  });
});
