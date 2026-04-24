import supertest from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Traceability query (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated trace query with 401', async () => {
    await supertest(app.getHttpServer())
      .post('/traceability/query')
      .send({ entryMode: 'object', objectType: 'materialLot', objectId: 'mb-1', traceMode: 'forward', viewMode: 'ledger', timeMode: 'current' })
      .expect((res) => {
        expect([401, 403]).toContain(res.status);
      });
  });
});
