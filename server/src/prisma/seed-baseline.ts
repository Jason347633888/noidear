import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { ensureSystemRoleBaseline } from './seeds/baseline/system-role-baseline';

export type BaselineSeedEnv = {
  DEFAULT_ADMIN_PASSWORD?: string;
  DEFAULT_SEED_PASSWORD?: string;
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

async function main() {
  const prisma = new PrismaClient();
  const seedOptions = buildBaselineSeedOptions(process.env);
  const adminPasswordHash = await bcrypt.hash(seedOptions.adminPassword, 10);

  await ensureSystemRoleBaseline(prisma, {
    ensureAdminUser: true,
    adminPasswordHash,
  });

  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
