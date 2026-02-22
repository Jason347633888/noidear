import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { loginForTest, getData } from './test-helpers';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('Backup API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let createdBackupId: string;

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

    prisma = app.get<PrismaService>(PrismaService);

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

  describe('POST /api/v1/backup/postgres/trigger', () => {
    it('should trigger a PostgreSQL backup successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/backup/postgres/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = getData(response.body);
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('PostgreSQL');

      if (body.id) {
        createdBackupId = body.id.toString();
      }
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/backup/postgres/trigger')
        .expect(401);
    });
  });

  describe('POST /api/v1/backup/minio/trigger', () => {
    it('should trigger a MinIO backup successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/backup/minio/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = getData(response.body);
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('MinIO');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/backup/minio/trigger')
        .expect(401);
    });
  });

  describe('GET /api/v1/backup/history', () => {
    it('should return backup history with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/backup/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      const body = getData(response.body);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(body.meta).toHaveProperty('total');
      expect(body.meta).toHaveProperty('page');
      expect(body.meta).toHaveProperty('limit');
      expect(Array.isArray(body.data)).toBe(true);

      if (body.data.length > 0) {
        createdBackupId = body.data[0].id.toString();
      }
    });

    it('should filter backup history by backupType', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/backup/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ backupType: 'postgres', page: 1, limit: 10 })
        .expect(200);

      const body = getData(response.body);
      expect(Array.isArray(body.data)).toBe(true);
      if (body.data.length > 0) {
        body.data.forEach((record: any) => {
          expect(record.backupType).toBe('postgres');
        });
      }
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/backup/history')
        .expect(401);
    });
  });

  describe('DELETE /api/v1/backup/:id', () => {
    it('should return 404 for non-existent backup ID', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/backup/999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should delete an existing backup record if one exists', async () => {
      if (!createdBackupId) {
        return;
      }

      await request(app.getHttpServer())
        .delete(`/api/v1/backup/${createdBackupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/backup/1')
        .expect(401);
    });
  });

  describe('POST /api/v1/backup/restore', () => {
    it('should return available backups for restore', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/backup/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ limit: 5 })
        .expect(200);

      const body = getData(response.body);
      expect(Array.isArray(body)).toBe(true);
    });

    it('should filter restore candidates by backupType', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/backup/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ backupType: 'postgres', limit: 5 })
        .expect(200);

      const body = getData(response.body);
      expect(Array.isArray(body)).toBe(true);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/backup/restore')
        .send({ limit: 5 })
        .expect(401);
    });
  });
});
