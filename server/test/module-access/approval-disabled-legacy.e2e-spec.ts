import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ApprovalDefinitionStartupScan } from '../../src/modules/unified-approval/approval-definition.startup-scan';
import { loginForTest } from '../test-helpers';

describe('E2E: ApprovalDefinition disabled_legacy lifecycle', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  const LEGACY_DEF_ID = 'e2e-legacy-test-def-001';

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
  });

  afterAll(async () => {
    await prisma.approvalDefinition.deleteMany({ where: { id: LEGACY_DEF_ID } });
    await app.close();
  });

  it('boot scan demotes definition with type=permission assignment to disabled_legacy', async () => {
    // Pre-seed a definition with a legacy permission-type assignment
    await prisma.approvalDefinition.upsert({
      where: { id: LEGACY_DEF_ID },
      update: {
        status: 'active',
        steps: [
          {
            stepKey: 's1',
            stepName: 'legacy step',
            mode: 'single',
            assignments: [{ type: 'permission', permissionCode: 'doc.approve' }],
          },
        ] as any,
      },
      create: {
        id: LEGACY_DEF_ID,
        module: 'document',
        resourceType: 'document',
        triggerKey: 'e2e_legacy_test',
        name: 'E2E Legacy Test Definition',
        version: 1,
        status: 'active',
        steps: [
          {
            stepKey: 's1',
            stepName: 'legacy step',
            mode: 'single',
            assignments: [{ type: 'permission', permissionCode: 'doc.approve' }],
          },
        ] as any,
      },
    });

    // Run startup scan directly
    const scanner = app.get(ApprovalDefinitionStartupScan);
    await scanner.onModuleInit();

    const row = await prisma.approvalDefinition.findUnique({ where: { id: LEGACY_DEF_ID } });
    expect(row?.status).toBe('disabled_legacy');
  });

  it('activate on disabled_legacy fails until steps are fixed', async () => {
    // Should fail: definition still has old steps
    await request(app.getHttpServer())
      .post(`/api/v1/approval-definitions/${LEGACY_DEF_ID}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    // Fix steps to valid ROLE assignment
    await request(app.getHttpServer())
      .patch(`/api/v1/approval-definitions/${LEGACY_DEF_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        steps: [
          {
            stepKey: 's1',
            stepName: 'fixed step',
            mode: 'single',
            assignments: [{ type: 'ROLE', roleCode: 'leader' }],
          },
        ],
      })
      .expect(200);

    // Now activation should succeed
    await request(app.getHttpServer())
      .post(`/api/v1/approval-definitions/${LEGACY_DEF_ID}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
