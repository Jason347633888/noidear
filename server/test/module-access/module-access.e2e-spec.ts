import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { loginForTest } from '../test-helpers';

describe('E2E: /module-access', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    const admin = await loginForTest(
      app,
      'admin',
      process.env.ADMIN_PASSWORD || 'ChangeMe123!',
    );
    adminToken = admin.token;

    // Ensure seed_user exists for E2E (roleCode=user)
    const bcrypt = require('bcrypt') as typeof import('bcrypt');
    const userRole = await prisma.role.findFirstOrThrow({ where: { code: 'user', deletedAt: null } });
    const userPw = await bcrypt.hash(process.env.E2E_USER_PASS || 'ChangeMe123!', 10);
    await prisma.user.upsert({
      where: { username: 'seed_user' },
      update: { status: 'active', loginAttempts: 0, lockedUntil: null },
      create: {
        id: 'e2e-seed-user-ma-001',
        username: 'seed_user',
        name: 'E2E Module Access Test User',
        password: userPw,
        roleId: userRole.id,
        status: 'active',
      },
    });

    const user = await loginForTest(
      app,
      'seed_user',
      process.env.E2E_USER_PASS || 'ChangeMe123!',
    );
    userToken = user.token;

    // Ensure all modules enabled for both roles before each test group
    await prisma.moduleAccessConfig.updateMany({
      where: { roleCode: 'user' },
      data: { enabled: true },
    });
  });

  afterAll(async () => {
    // Restore warehouse enabled for user
    await prisma.moduleAccessConfig.updateMany({
      where: { roleCode: 'user', moduleKey: 'warehouse' },
      data: { enabled: true },
    });
    await prisma.user.deleteMany({ where: { id: 'e2e-seed-user-ma-001' } });
    await app.close();
  });

  it('admin sees all 9 modules', async () => {
    const r = await request(app.getHttpServer())
      .get('/api/v1/module-access')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(r.body.data.roleCode).toBe('admin');
    expect(r.body.data.enabledModules).toHaveLength(9);
  });

  it('user with all modules enabled sees warehouse in enabledModules', async () => {
    const r = await request(app.getHttpServer())
      .get('/api/v1/module-access')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(r.body.data.enabledModules).toContain('warehouse');
  });

  it('admin toggles warehouse off for user; user no longer sees warehouse and gets 403', async () => {
    // Toggle warehouse off for user role
    await request(app.getHttpServer())
      .put('/api/v1/admin/module-access')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ modules: [{ moduleKey: 'warehouse', leader: true, user: false }] })
      .expect(200);

    // User should not see warehouse
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/module-access')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(meRes.body.data.enabledModules).not.toContain('warehouse');

    // Direct API call to warehouse endpoint should return 403 MODULE_DISABLED
    const denied = await request(app.getHttpServer())
      .get('/api/v1/warehouse/materials')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    const code = denied.body.code ?? denied.body.data?.code;
    expect(code).toBe('MODULE_DISABLED');
  });
});
