import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { ensureSystemRoleBaseline } from './seeds/baseline/system-role-baseline';

export type BaselineSeedEnv = {
  DEFAULT_ADMIN_PASSWORD?: string;
  DEFAULT_SEED_PASSWORD?: string;
  SEED_MINIMUM_ORG?: string;
};

export type BaselineSeedOptionsInput = {
  adminPassword: string;
  seedUserPassword: string;
  ensureMinimumOrganization: boolean;
};

export function buildBaselineSeedOptions(env: BaselineSeedEnv): BaselineSeedOptionsInput {
  const adminPassword = env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!';
  const seedUserPassword = env.DEFAULT_SEED_PASSWORD || adminPassword;

  return {
    adminPassword,
    seedUserPassword,
    ensureMinimumOrganization: env.SEED_MINIMUM_ORG === 'true',
  };
}

async function main() {
  const prisma = new PrismaClient();
  const seedOptions = buildBaselineSeedOptions(process.env);
  const [adminPasswordHash, seedUserPasswordHash] = await Promise.all([
    bcrypt.hash(seedOptions.adminPassword, 10),
    bcrypt.hash(seedOptions.seedUserPassword, 10),
  ]);

  await ensureSystemRoleBaseline(prisma, {
    ensureAdminUser: true,
    ensureMinimumOrganization: seedOptions.ensureMinimumOrganization,
    adminPasswordHash,
    seedUserPasswordHash,
  });

  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
