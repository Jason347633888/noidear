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
  // Always create a default E2E member user (seed_user / ChangeMe123!) for tests
  // that rely on a non-admin member without E2E_USER_USER being set.
  const defaultUsername = env.E2E_USER_USER || 'seed_user';
  const defaultPassword = env.E2E_USER_PASS || 'ChangeMe123!';

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

  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  await prisma.user.upsert({
    where: { username: defaultUsername },
    update: {
      roleId: userRoleId,
      departmentId: dept.id,
      status: 'active',
      deletedAt: null,
    },
    create: {
      id: randomUUID(),
      username: defaultUsername,
      name: 'E2E测试用户',
      password: passwordHash,
      status: 'active',
      roleId: userRoleId,
      departmentId: dept.id,
    },
  });

  console.log(`✅ E2E user '${defaultUsername}' ensured with department '${dept.name}'`);

  // If E2E_USER_USER differs from the default, also create that user
  if (env.E2E_USER_USER && env.E2E_USER_USER !== defaultUsername && env.E2E_USER_PASS) {
    const extraHash = await bcrypt.hash(env.E2E_USER_PASS, 10);
    await prisma.user.upsert({
      where: { username: env.E2E_USER_USER },
      update: {
        roleId: userRoleId,
        departmentId: dept.id,
        status: 'active',
        deletedAt: null,
      },
      create: {
        id: randomUUID(),
        username: env.E2E_USER_USER,
        name: 'E2E额外测试用户',
        password: extraHash,
        status: 'active',
        roleId: userRoleId,
        departmentId: dept.id,
      },
    });
    console.log(`✅ E2E user '${env.E2E_USER_USER}' ensured`);
  }
}

// Simplified single-approver steps for E2E — admin can sign any role,
// so one approve call per step is sufficient to advance the process.
const PRODUCT_RD_7STEP_TEMPLATE_NAME = '产品研发流程（7步）';

const PRODUCT_RD_7STEP_TEMPLATE_STEPS = [
  { stepNumber: 1, name: '新产品开发申请书', formCode: 'JL-09', requiredApprovals: [{ role: 'gm', dept: '总经办' }] },
  { stepNumber: 2, name: '新产品开发计划书', formCode: 'JL-10', requiredApprovals: [{ role: 'manager', dept: '产品开发部' }] },
  { stepNumber: 3, name: '研发试验记录', formCode: 'JL-11', requiredApprovals: [] },
  // Steps 4-7 simplified to single approver so E2E advanceToStep works with one approve call.
  { stepNumber: 4, name: '产品开发评审', formCode: 'JL-01', requiredApprovals: [{ role: 'gm', dept: '总经办' }] },
  { stepNumber: 5, name: '产品标签信息记录', formCode: 'JL-04', requiredApprovals: [{ role: 'gm', dept: '总经办' }] },
  { stepNumber: 6, name: '产品操作规程', formCode: 'JL-02+JL-06', requiredApprovals: [{ role: 'quality', dept: '品质部' }] },
  { stepNumber: 7, name: '产品验证记录', formCode: 'JL-07', requiredApprovals: [{ role: 'manufacture', dept: '制造部' }] },
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

async function ensureMaterialBaseline(prisma: PrismaClient): Promise<void> {
  // Ensure a material category exists
  const catCode = 'e2e-raw-material';
  const category = await prisma.materialCategory.upsert({
    where: { code: catCode },
    update: { name: 'E2E原料', status: 'active', deletedAt: null },
    create: {
      id: randomUUID(),
      code: catCode,
      name: 'E2E原料',
      status: 'active',
    },
  });

  // Ensure at least 3 active materials for WM E2E tests
  const materials = [
    { code: 'E2E-MAT-001', name: '小麦粉（E2E）', unit: 'kg' },
    { code: 'E2E-MAT-002', name: '白砂糖（E2E）', unit: 'kg' },
    { code: 'E2E-MAT-003', name: '植物油（E2E）', unit: 'L' },
  ];

  for (const mat of materials) {
    await prisma.material.upsert({
      where: { materialCode: mat.code },
      update: { name: mat.name, categoryId: category.id, status: 'active', deletedAt: null },
      create: {
        id: randomUUID(),
        materialCode: mat.code,
        name: mat.name,
        unit: mat.unit,
        categoryId: category.id,
        status: 'active',
      },
    });
  }
  console.log('✅ E2E 物料基线已确保（3条）');
}

async function ensureTrainingPlanBaseline(prisma: PrismaClient): Promise<void> {
  // Ensure a pending_approval training plan exists for TRN-004 E2E test
  const admin = await prisma.user.findFirst({ where: { username: 'admin', deletedAt: null }, select: { id: true } });
  if (!admin) {
    console.log('⚠️  admin user not found, skipping training plan baseline');
    return;
  }

  const e2eYear = 9000;
  await prisma.trainingPlan.upsert({
    where: { year: e2eYear },
    update: { status: 'pending_approval', title: 'E2E年度培训计划（待审批）' },
    create: {
      year: e2eYear,
      title: 'E2E年度培训计划（待审批）',
      status: 'pending_approval',
      createdBy: admin.id,
    },
  });
  console.log('✅ E2E TrainingPlan 基线已确保（pending_approval）');
}

async function main() {
  const prisma = new PrismaClient();
  const seedOptions = buildBaselineSeedOptions(process.env);
  const adminPasswordHash = await bcrypt.hash(seedOptions.adminPassword, 10);

  await ensureSystemRoleBaseline(prisma, {
    ensureAdminUser: true,
    adminPasswordHash,
  });

  // E2E-only fixtures: only seed in test environment to avoid polluting production/staging DBs
  if (process.env.NODE_ENV === 'test') {
    const userRole = await prisma.role.findFirst({ where: { code: 'user', deletedAt: null } });
    if (userRole) {
      await ensureE2EUsers(prisma, process.env, userRole.id);
    }

    await ensureProcessTemplate(prisma);
    await ensureMaterialBaseline(prisma);
    await ensureTrainingPlanBaseline(prisma);
  }

  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
