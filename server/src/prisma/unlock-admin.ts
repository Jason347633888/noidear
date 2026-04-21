/**
 * 解锁 admin 账号（测试环境用）
 * 运行：npx ts-node src/prisma/unlock-admin.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { username: 'admin' },
    data:  { loginAttempts: 0, firstFailedAt: null, lockedUntil: null },
  });
  console.log(`✅ 已解锁：${user.username}`);
  console.log(`   loginAttempts: ${user.loginAttempts}`);
  console.log(`   lockedUntil:   ${user.lockedUntil}`);
  console.log(`   firstFailedAt: ${user.firstFailedAt}`);
  console.log(`   status:        ${user.status}`);
}

main()
  .catch((e) => { console.error('❌ 失败:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
