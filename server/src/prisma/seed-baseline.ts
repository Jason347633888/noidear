import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { ensureSystemRoleBaseline } from './seeds/baseline/system-role-baseline';

export type BaselineSeedEnv = {
  DEFAULT_ADMIN_PASSWORD?: string;
  DEFAULT_SEED_PASSWORD?: string;
  E2E_USER_USER?: string;
  E2E_USER_PASS?: string;
};

export type BaselineSeedOptionsInput = {
  adminPassword: string;
  seedUserPassword: string;
};

export function buildBaselineSeedOptions(env: BaselineSeedEnv): BaselineSeedOptionsInput {
  const adminPassword = env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!';
  const seedUserPassword = env.DEFAULT_SEED_PASSWORD || adminPassword;

  return {
    adminPassword,
    seedUserPassword,
  };
}

async function ensureE2EUsers(
  prisma: PrismaClient,
  env: BaselineSeedEnv,
  userRoleId: string,
) {
  const e2eUsername = env.E2E_USER_USER;
  const e2ePassword = env.E2E_USER_PASS;
  if (!e2eUsername || !e2ePassword) return;

  // Ensure a baseline department exists for the E2E member user
  const deptCode = 'e2e-test-dept';
  const dept = await prisma.department.upsert({
    where: { code: deptCode },
    update: { name: 'E2E测试部门', status: 'active', deletedAt: null },
    create: {
      id: randomUUID(),
      code: deptCode,
      name: 'E2E测试部门',
      status: 'active',
    },
  });

  const passwordHash = await bcrypt.hash(e2ePassword, 10);
  await prisma.user.upsert({
    where: { username: e2eUsername },
    update: {
      roleId: userRoleId,
      departmentId: dept.id,
      status: 'active',
      deletedAt: null,
    },
    create: {
      id: randomUUID(),
      username: e2eUsername,
      name: 'E2E测试用户',
      password: passwordHash,
      status: 'active',
      roleId: userRoleId,
      departmentId: dept.id,
    },
  });

  console.log(`✅ E2E user '${e2eUsername}' ensured with department '${dept.name}'`);
}

async function main() {
  const prisma = new PrismaClient();
  const seedOptions = buildBaselineSeedOptions(process.env);
  const adminPasswordHash = await bcrypt.hash(seedOptions.adminPassword, 10);

  await ensureSystemRoleBaseline(prisma, {
    ensureAdminUser: true,
    adminPasswordHash,
  });

  // Retrieve the userRole id for E2E user creation
  const userRole = await prisma.role.findFirst({ where: { code: 'user', deletedAt: null } });
  if (userRole) {
    await ensureE2EUsers(prisma, process.env, userRole.id);
  }

  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
