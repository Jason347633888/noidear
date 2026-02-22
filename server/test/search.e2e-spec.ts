import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { loginForTest } from './test-helpers';

describe('Search (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
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

  describe('GET /api/v1/search/query', () => {
    it('should return 401 when no auth token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/search/query?keyword=test')
        .expect(401);
    });

    it('should return 400 when keyword is missing', () => {
      return request(app.getHttpServer())
        .get('/api/v1/search/query')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return search results when keyword provided', () => {
      return request(app.getHttpServer())
        .get('/api/v1/search/query?keyword=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('keyword', 'test');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/search/query?keyword=a&page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeLessThanOrEqual(5);
        });
    });
  });

  describe('POST /api/v1/search/index/:documentId', () => {
    it('should return 401 when no auth token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/search/index/some-doc-id')
        .expect(401);
    });

    it('should return 404 when document not found', () => {
      return request(app.getHttpServer())
        .post('/api/v1/search/index/non-existent-doc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('DELETE /api/v1/search/index/:documentId', () => {
    it('should return 401 when no auth token', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/search/index/some-doc-id')
        .expect(401);
    });

    it('should return 404 when index not found', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/search/index/non-existent-doc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
