import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { loginForTest } from './test-helpers';

describe('Recommendation (e2e)', () => {
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

  describe('POST /api/v1/recommendations/track', () => {
    it('should return 401 when no auth token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/recommendations/track')
        .send({ documentId: 'non-existent-id' })
        .expect(401);
    });

    it('should return 404 when document not found', () => {
      return request(app.getHttpServer())
        .post('/api/v1/recommendations/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ documentId: 'non-existent-doc-id' })
        .expect(404);
    });
  });

  describe('GET /api/v1/recommendations/my', () => {
    it('should return 401 when no auth token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/recommendations/my')
        .expect(401);
    });

    it('should return recommendations list when authenticated', () => {
      return request(app.getHttpServer())
        .get('/api/v1/recommendations/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('POST /api/v1/recommendations/generate', () => {
    it('should trigger recommendation generation', () => {
      return request(app.getHttpServer())
        .post('/api/v1/recommendations/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);
    });
  });
});
