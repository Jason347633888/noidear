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

const PRODUCT_RD_7STEP_TEMPLATE_NAME = '产品研发流程（7步）';

const PRODUCT_RD_7STEP_TEMPLATE_STEPS = [
  { stepNumber: 1, name: '新产品开发申请书', formCode: 'JL-09', requiredApprovals: [{ role: 'gm', dept: '总经办' }] },
  { stepNumber: 2, name: '新产品开发计划书', formCode: 'JL-10', requiredApprovals: [{ role: 'manager', dept: '产品开发部' }] },
  { stepNumber: 3, name: '研发试验记录', formCode: 'JL-11', requiredApprovals: [] },
  { stepNumber: 4, name: '产品开发评审', formCode: 'JL-01', requiredApprovals: [{ role: 'quality', dept: '品质部' }, { role: 'manufacture', dept: '制造部' }, { role: 'purchase', dept: '采购部' }, { role: 'development', dept: '产品开发部' }, { role: 'gm', dept: '总经办' }] },
  { stepNumber: 5, name: '产品标签信息记录', formCode: 'JL-04', requiredApprovals: [{ role: 'gm', dept: '总经办' }] },
  { stepNumber: 6, name: '产品操作规程', formCode: 'JL-02+JL-06', requiredApprovals: [{ role: 'quality', dept: '品质部' }, { role: 'manufacture', dept: '制造部' }] },
  { stepNumber: 7, name: '产品验证记录', formCode: 'JL-07', requiredApprovals: [{ role: 'manufacture', dept: '制造部' }, { role: 'quality', dept: '品质部' }, { role: 'food_safety_leader', dept: '食品安全小组' }] },
];

async function ensureProcessTemplate(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.processTemplate.findFirst({
    where: { name: PRODUCT_RD_7STEP_TEMPLATE_NAME },
  });

  if (existing) {
    await prisma.processTemplate.update({
      where: { id: existing.id },
      data: { steps: PRODUCT_RD_7STEP_TEMPLATE_STEPS as any, isActive: true },
    });
    console.log('✅ 产品研发7步流程模板已更新，ID:', existing.id);
  } else {
    await prisma.processTemplate.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    const created = await prisma.processTemplate.create({
      data: {
        name: PRODUCT_RD_7STEP_TEMPLATE_NAME,
        steps: PRODUCT_RD_7STEP_TEMPLATE_STEPS as any,
        isActive: true,
      },
    });
    console.log('✅ 产品研发7步流程模板已创建，ID:', created.id);
  }
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

  await ensureProcessTemplate(prisma);

  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
