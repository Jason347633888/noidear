import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { loginForTest } from './test-helpers';

describe('WorkflowAdvanced (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
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

  describe('POST /api/v1/workflow/tasks/:id/delegate', () => {
    it('should return 401 when no auth token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/workflow/tasks/some-id/delegate')
        .expect(401);
    });

    it('should return 404 when task not found', () => {
      return request(app.getHttpServer())
        .post('/api/v1/workflow/tasks/non-existent-task/delegate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ toUserId: 'some-user-id' })
        .expect(404);
    });
  });

  describe('POST /api/v1/workflow/tasks/:id/rollback', () => {
    it('should return 401 when no auth token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/workflow/tasks/some-id/rollback')
        .expect(401);
    });
  });

  describe('POST /api/v1/workflow/tasks/:id/transfer', () => {
    it('should return 401 when no auth token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/workflow/tasks/some-id/transfer')
        .expect(401);
    });
  });

  describe('GET /api/v1/workflow/delegation-logs', () => {
    it('should return 401 when no auth token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/workflow/delegation-logs')
        .expect(401);
    });

    it('should return delegation logs list', () => {
      return request(app.getHttpServer())
        .get('/api/v1/workflow/delegation-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });
});
