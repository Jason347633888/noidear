import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { ensureSystemRoleBaseline } from './seeds/baseline/system-role-baseline';
import { seedDocumentDemo } from './seeds/demo/seed-document-demo';
import { seedOpsDemo } from './seeds/demo/seed-ops-demo';

const prisma = new PrismaClient();

async function main() {
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!';
  const adminPasswordHash = await bcrypt.hash(password, 10);
  await ensureSystemRoleBaseline(prisma, { ensureAdminUser: true, adminPasswordHash });
  await seedDocumentDemo();
  await seedOpsDemo();

  // module-access defaults
  const MODULE_KEYS_SEED = ['work_execution','document_approval','production_execution','product_rd','quality_compliance','equipment_site','traceability_batch','warehouse','training'] as const;
  for (const moduleKey of MODULE_KEYS_SEED)
    for (const roleCode of ['leader', 'user'] as const)
      await prisma.moduleAccessConfig.upsert({
        where: { moduleKey_roleCode: { moduleKey, roleCode } },
        update: {},
        create: { moduleKey, roleCode, enabled: true },
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
