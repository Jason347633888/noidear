import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { ensureSystemRoleBaseline } from './seeds/baseline/system-role-baseline';

const prisma = new PrismaClient();

async function main() {
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!';
  const adminPasswordHash = await bcrypt.hash(password, 10);

  await ensureSystemRoleBaseline(prisma, {
    ensureAdminUser: true,
    adminPasswordHash,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
