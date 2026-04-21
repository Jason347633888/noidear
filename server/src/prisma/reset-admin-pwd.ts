/**
 * 重置 admin 密码（测试环境用）
 * 运行：ADMIN_PASSWORD=xxx npx ts-node src/prisma/reset-admin-pwd.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const newPassword = process.env.ADMIN_PASSWORD;
  if (!newPassword) {
    throw new Error('请设置 ADMIN_PASSWORD 环境变量');
  }
  const hash = await bcrypt.hash(newPassword, 10);
  const user = await prisma.user.update({
    where: { username: 'admin' },
    data:  { password: hash, loginAttempts: 0, lockedUntil: null },
  });
  console.log(`✅ 密码已重置：${user.username}`);
}

main()
  .catch((e) => { console.error('❌ 失败:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
