import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('E2E: Role.code CHECK constraint', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up in case the constraint didn't fire (dev DB without migration)
    await prisma.$executeRawUnsafe(
      `DELETE FROM roles WHERE code = 'quality_manager'`,
    ).catch(() => {});
    await app.close();
  });

  it('inserting a role with non-whitelisted code fails at DB layer', async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO roles (id, code, name) VALUES ('e2e-bad-role', 'quality_manager', 'QM')`,
    ).rejects.toThrow(/check|constraint/i);
  });
});
