/**
 * 清理脚本：软删除生产部及其成员（测试环境用）
 * 运行：npx ts-node src/prisma/cleanup-prod-dept.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  // 1. 先解除部门的 managerId 引用，避免外键约束冲突
  await prisma.department.updateMany({
    where: { code: 'PROD' },
    data:  { managerId: null },
  });

  // 2. 软删除生产部的两名员工
  const { count: userCount } = await prisma.user.updateMany({
    where:  { username: { in: ['prod_leader', 'prod_staff'] } },
    data:   { deletedAt: now, status: 'inactive' },
  });

  // 3. 软删除生产部
  const { count: deptCount } = await prisma.department.updateMany({
    where: { code: 'PROD' },
    data:  { deletedAt: now, status: 'inactive' },
  });

  console.log(`✅ 已软删除：生产部（${deptCount} 条）、员工（${userCount} 条）`);
}

main()
  .catch((e) => {
    console.error('❌ 清理失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
