/**
 * E2E Seed Script — 为 Playwright E2E 测试补充必要的基础数据
 *
 * 运行方式：
 *   cd server && npx tsx src/prisma/seed-e2e.ts
 *
 * 幂等性：所有操作均使用 upsert / findFirst guard，可安全重复执行。
 *
 * 覆盖以下 BDD 测试所需数据：
 *   DOC-003~005, DOC-011, DOC-020~022  — draft / effective 文档
 *   IA-002~004                          — 内审计划需要文档
 *   APPR-001, APPR-003                  — 会签审批记录
 *   APPR-010, APPR-011                  — 顺签审批记录
 *   BT-001~003, BT-010, BT-020, BT-030 — 物料批次 / 生产批次
 *   NC-002, NC-004, NC-005              — 不合格品记录
 *   REC-001~002, REC-004~005            — 产品召回记录
 *   TSK-MY-002, BDD-TSK-006             — 成员用户的任务实例
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────────────────────
// 常量：依赖已有 baseline seed 创建的数据
// ──────────────────────────────────────────────────────────────────────────
const COMPANY_ID = '1';
const ADMIN_USER_ID = '0000000000000000001';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysLater(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// ──────────────────────────────────────────────────────────────────────────
// 辅助：查询用户 ID
// ──────────────────────────────────────────────────────────────────────────
async function ensureE2EMemberUser(): Promise<void> {
  const department = await prisma.department.upsert({
    where: { code: 'e2e-test-dept' },
    update: { name: 'E2E测试部门', status: 'active', deletedAt: null },
    create: {
      id: 'e2e-test-dept',
      code: 'e2e-test-dept',
      name: 'E2E测试部门',
      status: 'active',
    },
  });

  const userRole = await prisma.role.findFirst({
    where: { code: 'user', deletedAt: null },
    select: { id: true },
  });

  if (!userRole) {
    throw new Error('seed_user requires role code=user');
  }

  const passwordHash = await bcrypt.hash(process.env.E2E_USER_PASS || 'ChangeMe123!', 10);

  await prisma.user.upsert({
    where: { username: 'seed_user' },
    update: {
      roleId: userRole.id,
      departmentId: department.id,
      status: 'active',
      deletedAt: null,
      loginAttempts: 0,
      firstFailedAt: null,
      lockedUntil: null,
    },
    create: {
      id: 'e2e-seed-user-001',
      username: 'seed_user',
      name: 'E2E测试用户',
      password: passwordHash,
      roleId: userRole.id,
      departmentId: department.id,
      status: 'active',
    },
  });
}

async function findUserIds(): Promise<{ adminId: string; memberId: string | null }> {
  const admin = await prisma.user.findFirst({
    where: { username: 'admin' },
    select: { id: true },
  });
  const member = await prisma.user.findFirst({
    where: { username: 'seed_user' },
    select: { id: true },
  });
  return {
    adminId: admin?.id ?? ADMIN_USER_ID,
    memberId: member?.id ?? null,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// 1. 文档 — draft + effective + pending（DOC / IA 系列测试）
// ──────────────────────────────────────────────────────────────────────────
async function seedDocuments(adminId: string): Promise<string[]> {
  console.log('── 文档 (Documents)...');

  const docs = [
    { id: 'e2e-doc-draft-001', level: 3, number: 'E2E-DRAFT-001', title: 'E2E 测试草稿文档 001', status: 'draft' },
    { id: 'e2e-doc-draft-002', level: 3, number: 'E2E-DRAFT-002', title: 'E2E 测试草稿文档 002', status: 'draft' },
    { id: 'e2e-doc-draft-003', level: 3, number: 'E2E-DRAFT-003', title: 'E2E 测试草稿文档 003', status: 'draft' },
    { id: 'e2e-doc-draft-004', level: 3, number: 'E2E-DRAFT-004', title: 'E2E 测试草稿文档 004', status: 'draft' },
    { id: 'e2e-doc-draft-005', level: 3, number: 'E2E-DRAFT-005', title: 'E2E 测试草稿文档 005', status: 'draft' },
    { id: 'e2e-doc-effective-001', level: 2, number: 'E2E-EFF-001', title: 'E2E 测试生效文档 001', status: 'effective' },
    { id: 'e2e-doc-effective-002', level: 2, number: 'E2E-EFF-002', title: 'E2E 测试生效文档 002', status: 'effective' },
    { id: 'e2e-doc-effective-003', level: 2, number: 'E2E-EFF-003', title: 'E2E 测试生效文档 003', status: 'effective' },
    { id: 'e2e-doc-effective-004', level: 2, number: 'E2E-EFF-004', title: 'E2E 测试生效文档 004', status: 'effective' },
    { id: 'e2e-doc-pending-001', level: 3, number: 'E2E-PEND-001', title: 'E2E 测试审批中文档 001', status: 'pending_approval' },
    { id: 'e2e-doc-archived-001', level: 2, number: 'E2E-ARCH-001', title: 'E2E 测试已归档文档 001', status: 'archived' },
    { id: 'e2e-doc-archived-002', level: 2, number: 'E2E-ARCH-002', title: 'E2E 测试已归档文档 002', status: 'archived' },
  ];

  const created: string[] = [];

  for (const doc of docs) {
    try {
      await prisma.document.upsert({
        where: { id: doc.id },
        update: {
          status: doc.status,
          title: doc.title,
          approverId: doc.status !== 'draft' ? adminId : null,
          approvedAt: doc.status !== 'draft' ? daysAgo(7) : null,
          effective_date: doc.status === 'effective' ? daysAgo(14) : null,
        },
        create: {
          id: doc.id,
          level: doc.level,
          number: doc.number,
          title: doc.title,
          filePath: `/e2e-test-files/${doc.number}.pdf`,
          fileName: `${doc.number}.pdf`,
          fileSize: 10240,
          fileType: 'application/pdf',
          version: 1.0,
          status: doc.status,
          creatorId: adminId,
          approverId: doc.status !== 'draft' ? adminId : null,
          approvedAt: doc.status !== 'draft' ? daysAgo(7) : null,
          effective_date: doc.status === 'effective' ? daysAgo(14) : null,
          content_md: `# ${doc.title}\n\nE2E 测试专用文档，请勿在生产环境使用。`,
        },
      });
      created.push(doc.id);
    } catch (err: any) {
      if (err.code !== 'P2002') console.warn(`   ⚠ 文档 ${doc.number}: ${err.message}`);
    }
  }

  console.log(`   ✓ 文档: ${created.length} 条新增`);
  return docs.map((d) => d.id);
}

// ──────────────────────────────────────────────────────────────────────────
// 2. 登录日志（AUD 审计系列）
// ──────────────────────────────────────────────────────────────────────────
async function seedLoginLogs(adminId: string): Promise<void> {
  console.log('── 登录日志 (LoginLog)...');

  const logs = [
    { id: 'e2e-login-success-001', userId: adminId, username: 'admin', action: 'login', status: 'success', ipAddress: '127.0.0.1', userAgent: 'E2E Playwright', loginTime: daysAgo(1) },
    { id: 'e2e-login-success-002', userId: adminId, username: 'admin', action: 'login', status: 'success', ipAddress: '127.0.0.2', userAgent: 'E2E Playwright', loginTime: daysAgo(2) },
    { id: 'e2e-login-success-003', userId: adminId, username: 'admin', action: 'login', status: 'success', ipAddress: '127.0.0.3', userAgent: 'E2E Playwright', loginTime: daysAgo(3) },
    { id: 'e2e-login-failed-001', userId: adminId, username: 'admin', action: 'login', status: 'failed', ipAddress: '127.0.0.4', userAgent: 'E2E Playwright', loginTime: daysAgo(4), failReason: 'E2E invalid password' },
    { id: 'e2e-login-failed-002', userId: adminId, username: 'admin', action: 'login', status: 'failed', ipAddress: '127.0.0.5', userAgent: 'E2E Playwright', loginTime: daysAgo(5), failReason: 'E2E invalid password' },
  ];

  for (const log of logs) {
    await prisma.loginLog.upsert({
      where: { id: log.id },
      update: log,
      create: log,
    });
  }

  console.log(`   ✓ 登录日志: ${logs.length} 条已就绪`);
}

// ──────────────────────────────────────────────────────────────────────────
// 3. 设备与地点（Equipment）
// ──────────────────────────────────────────────────────────────────────────
async function seedEquipmentAndLocations(): Promise<void> {
  console.log('── 设备与地点 (Equipment / Location)...');

  await prisma.equipment.upsert({
    where: { code: 'E2E-EQ-001' },
    update: {
      name: 'E2E 测试设备 001',
      category: 'production',
      location: 'e2e-location-001',
      status: 'active',
    },
    create: {
      id: 'e2e-equipment-001',
      code: 'E2E-EQ-001',
      name: 'E2E 测试设备 001',
      category: 'production',
      location: 'e2e-location-001',
      status: 'active',
    },
  });

  console.log('   ✓ 设备与地点: e2e-equipment-001 / e2e-location-001 已就绪');
}

// ──────────────────────────────────────────────────────────────────────────
// 4. 统一审批定义（ApprovalDefinition）
// ──────────────────────────────────────────────────────────────────────────
async function seedApprovalDefinitions(adminId: string): Promise<void> {
  console.log('── 统一审批定义 (ApprovalDefinition)...');

  const definitions = [
    {
      id: 'e2e-def-countersign',
      module: 'document',
      resourceType: 'document',
      triggerKey: 'countersign_review',
      name: 'E2E 会签审批',
      version: 1,
      status: 'active',
      steps: [
        {
          stepKey: 'step1',
          stepName: '会签',
          mode: 'COUNTERSIGN',
          assignments: [{ type: 'USER', userId: adminId }],
        },
      ],
    },
    {
      id: 'e2e-def-sequential',
      module: 'document',
      resourceType: 'document',
      triggerKey: 'sequential_review',
      name: 'E2E 顺签审批',
      version: 1,
      status: 'active',
      steps: [
        {
          stepKey: 'step1',
          stepName: '顺签第一级',
          mode: 'SEQUENTIAL',
          assignments: [{ type: 'USER', userId: adminId }],
        },
      ],
    },
  ];

  for (const definition of definitions) {
    await prisma.approvalDefinition.upsert({
      where: {
        module_resourceType_triggerKey_version: {
          module: definition.module,
          resourceType: definition.resourceType,
          triggerKey: definition.triggerKey,
          version: definition.version,
        },
      },
      update: {
        id: definition.id,
        name: definition.name,
        status: definition.status,
        steps: definition.steps,
      },
      create: definition,
    });
  }

  console.log(`   ✓ 统一审批定义: ${definitions.length} 条已就绪`);
}

// ──────────────────────────────────────────────────────────────────────────
// (原) 2. 不合格品 — 各状态（NC-002, NC-004, NC-005）
// ──────────────────────────────────────────────────────────────────────────
async function seedNonConformances(): Promise<string[]> {
  console.log('── 不合格品 (NonConformance)...');

  const ncs = [
    {
      nc_no: 'E2E-NC-001',
      source_type: 'production_batch',
      source_id: 'e2e-batch-001',
      description: 'E2E 测试：产品外观不合格',
      qty: 10,
      unit: 'kg',
      discovered_at: daysAgo(3),
      discovered_by: 'E2E 测试员',
      status: 'open',
    },
    {
      nc_no: 'E2E-NC-002',
      source_type: 'material_batch',
      source_id: 'e2e-mat-batch-001',
      description: 'E2E 测试：原料菌落超标',
      qty: 50,
      unit: 'kg',
      discovered_at: daysAgo(5),
      discovered_by: 'E2E 质检员',
      disposition: 'return',
      status: 'dispositioned',
      disposition_at: daysAgo(4),
    },
    {
      nc_no: 'E2E-NC-003',
      source_type: 'product',
      source_id: 'e2e-product-001',
      description: 'E2E 测试：包装标签错误',
      qty: 200,
      unit: '件',
      discovered_at: daysAgo(1),
      discovered_by: 'E2E 包装员',
      disposition: 'scrap',
      status: 'closed',
      disposition_at: daysAgo(1),
    },
    {
      nc_no: 'E2E-NC-004',
      source_type: 'production_batch',
      source_id: 'e2e-batch-002',
      description: 'E2E 测试：产品重量偏差超限',
      qty: 30,
      unit: 'kg',
      discovered_at: new Date(),
      discovered_by: 'E2E 检验员',
      disposition: 'concession',
      status: 'open',
    },
    {
      nc_no: 'E2E-NC-005',
      source_type: 'material_batch',
      source_id: 'e2e-mat-batch-002',
      description: 'E2E 测试：色素含量超标',
      qty: 15,
      unit: 'kg',
      discovered_at: daysAgo(2),
      discovered_by: 'E2E 实验员',
      status: 'open',
    },
  ];

  const created: string[] = [];

  for (const nc of ncs) {
    try {
      const existing = await prisma.nonConformance.findFirst({
        where: { nc_no: nc.nc_no, company_id: COMPANY_ID },
      });
      if (!existing) {
        const record = await prisma.nonConformance.create({
          data: {
            company_id: COMPANY_ID,
            nc_no: nc.nc_no,
            source_type: nc.source_type,
            source_id: nc.source_id,
            description: nc.description,
            qty: nc.qty ?? null,
            unit: nc.unit ?? null,
            discovered_at: nc.discovered_at,
            discovered_by: nc.discovered_by ?? null,
            disposition: nc.disposition ?? null,
            disposition_by: nc.disposition ? 'E2E 品质主管' : null,
            disposition_at: nc.disposition_at ?? null,
            status: nc.status,
          },
        });
        created.push(record.id);
      }
    } catch (err: any) {
      console.warn(`   ⚠ NC ${nc.nc_no}: ${err.message}`);
    }
  }

  console.log(`   ✓ 不合格品: ${created.length} 条新增`);
  return created;
}

// ──────────────────────────────────────────────────────────────────────────
// 3. 产品召回 — draft / under_review / completed / cancelled（REC系列）
// ──────────────────────────────────────────────────────────────────────────
async function seedProductRecalls(adminId: string): Promise<string[]> {
  console.log('── 产品召回 (ProductRecall)...');

  const recalls = [
    {
      id: 'e2e-recall-draft-001',
      recall_no: 'E2E-REC-2026-001',
      title: 'E2E 测试召回记录（草稿）',
      reason: 'E2E 测试：产品标签信息错误',
      risk_level: 'low',
      status: 'draft',
    },
    {
      id: 'e2e-recall-review-001',
      recall_no: 'E2E-REC-2026-002',
      title: 'E2E 测试召回记录（审核中）',
      reason: 'E2E 测试：产品污染风险',
      risk_level: 'medium',
      status: 'under_review',
      reviewed_by: adminId,
      reviewed_at: daysAgo(1),
    },
    {
      id: 'e2e-recall-completed-001',
      recall_no: 'E2E-REC-2026-003',
      title: 'E2E 测试召回记录（已完成）',
      reason: 'E2E 测试：产品过敏原标注缺失',
      risk_level: 'high',
      status: 'completed',
      reviewed_by: adminId,
      reviewed_at: daysAgo(10),
      completed_by: adminId,
      completed_at: daysAgo(5),
      completion_summary: 'E2E 测试：所有批次已召回完毕',
    },
    {
      id: 'e2e-recall-cancelled-001',
      recall_no: 'E2E-REC-2026-004',
      title: 'E2E 测试召回记录（已取消）',
      reason: 'E2E 测试：误报，经核查无需召回',
      risk_level: 'low',
      status: 'cancelled',
      cancelled_at: daysAgo(2),
      cancel_reason: 'E2E 测试取消原因',
    },
  ];

  const created: string[] = [];

  for (const recall of recalls) {
    try {
      const existing = await prisma.productRecall.findFirst({
        where: { recall_no: recall.recall_no, company_id: COMPANY_ID },
      });
      if (!existing) {
        await prisma.productRecall.create({
          data: {
            id: recall.id,
            company_id: COMPANY_ID,
            recall_no: recall.recall_no,
            title: recall.title,
            reason: recall.reason,
            risk_level: recall.risk_level,
            status: recall.status,
            requested_by: adminId,
            requested_at: daysAgo(15),
            reviewed_by: recall.reviewed_by ?? null,
            reviewed_at: recall.reviewed_at ?? null,
            completed_by: recall.completed_by ?? null,
            completed_at: recall.completed_at ?? null,
            completion_summary: recall.completion_summary ?? null,
            cancelled_at: recall.cancelled_at ?? null,
            cancel_reason: recall.cancel_reason ?? null,
          },
        });
        created.push(recall.id);
      }
    } catch (err: any) {
      console.warn(`   ⚠ 召回 ${recall.recall_no}: ${err.message}`);
    }
  }

  console.log(`   ✓ 产品召回: ${created.length} 条新增`);
  return created;
}

// ──────────────────────────────────────────────────────────────────────────
// 4. 物料分类 + 物料 + 物料批次（BT-001~003）
// ──────────────────────────────────────────────────────────────────────────
async function seedMaterialBatches(): Promise<string[]> {
  console.log('── 物料批次 (MaterialBatch)...');

  // 4a. 确保物料分类存在
  let category = await prisma.materialCategory.findFirst({
    where: { name: 'E2E 测试分类' },
  });
  if (!category) {
    try {
      category = await prisma.materialCategory.create({
        data: { name: 'E2E 测试分类', code: 'E2E-CAT', description: 'E2E 测试专用' },
      });
    } catch (err: any) {
      // Category might already exist with different case
      category = await prisma.materialCategory.findFirst({ where: { code: 'E2E-CAT' } });
      if (!category) throw err;
    }
  }

  // 4b. 确保物料存在
  let material = await prisma.material.findFirst({
    where: { materialCode: 'E2E-MAT-001' },
  });
  if (!material) {
    try {
      material = await prisma.material.create({
        data: {
          materialCode: 'E2E-MAT-001',
          name: 'E2E 测试物料（白砂糖）',
          specification: '50kg/袋',
          unit: 'kg',
          categoryId: category.id,
          shelfLife: 730,
          safetyStock: 100,
          status: 'active',
        },
      });
    } catch (err: any) {
      material = await prisma.material.findFirst({ where: { materialCode: 'E2E-MAT-001' } });
      if (!material) { console.warn(`   ⚠ 物料创建失败: ${err.message}`); return []; }
    }
  }

  // 4c. 物料批次
  const batches = [
    {
      batchNumber: 'E2E-MB-2026-001',
      supplierBatchNo: 'SUP-2026-A001',
      productionDate: daysAgo(30),
      expiryDate: daysLater(700),
      quantity: 500,
      status: 'normal' as const,
      warehouseLocation: 'A-01-001',
    },
    {
      batchNumber: 'E2E-MB-2026-002',
      supplierBatchNo: 'SUP-2026-A002',
      productionDate: daysAgo(60),
      expiryDate: daysLater(670),
      quantity: 200,
      status: 'normal' as const,
      warehouseLocation: 'A-01-002',
    },
    {
      batchNumber: 'E2E-MB-2026-003',
      supplierBatchNo: 'SUP-2026-B001',
      productionDate: daysAgo(90),
      expiryDate: daysLater(10),
      quantity: 50,
      status: 'normal' as const,
      warehouseLocation: 'A-02-001',
    },
  ];

  const created: string[] = [];

  for (const b of batches) {
    try {
      const existing = await prisma.materialBatch.findFirst({
        where: { batchNumber: b.batchNumber },
      });
      if (!existing) {
        const batch = await prisma.materialBatch.create({
          data: {
            batchNumber: b.batchNumber,
            materialId: material!.id,
            supplierBatchNo: b.supplierBatchNo,
            productionDate: b.productionDate,
            expiryDate: b.expiryDate,
            quantity: b.quantity,
            status: b.status,
            lotStatus: 'in_stock' as any,
            warehouseLocation: b.warehouseLocation,
          },
        });
        created.push(batch.id);
      }
    } catch (err: any) {
      console.warn(`   ⚠ 物料批次 ${b.batchNumber}: ${err.message}`);
    }
  }

  console.log(`   ✓ 物料批次: ${created.length} 条新增`);
  return created;
}

// ──────────────────────────────────────────────────────────────────────────
// 5. 会签审批记录（APPR-001, APPR-003）
// ──────────────────────────────────────────────────────────────────────────
async function seedCountersignApprovals(adminId: string, docIds: string[]): Promise<void> {
  console.log('── 会签审批记录 (Countersign Approvals)...');

  const docId = docIds.find((id) => id === 'e2e-doc-pending-001') ?? docIds[0];
  if (!docId) {
    console.warn('   ⚠ 无可用文档，跳过会签审批 seed');
    return;
  }

  const records = [
    { id: 'e2e-appr-cs-pending-001', documentId: docId, approverId: adminId, status: 'pending', approvalType: 'countersign', sequence: 0, groupId: 'e2e-countersign-group-pending', level: 1 },
    { id: 'e2e-appr-cs-pending-002', documentId: docId, approverId: adminId, status: 'pending', approvalType: 'countersign', sequence: 0, groupId: 'e2e-countersign-group-pending', level: 1 },
    { id: 'e2e-appr-cs-approved-001', documentId: docId, approverId: adminId, status: 'approved', approvalType: 'countersign', sequence: 0, groupId: 'e2e-countersign-group-approved', level: 1, approvedAt: daysAgo(1) },
    { id: 'e2e-appr-cs-cancelled-001', documentId: docId, approverId: adminId, status: 'cancelled', approvalType: 'countersign', sequence: 0, groupId: 'e2e-countersign-group-cancelled', level: 1 },
  ];

  let count = 0;
  for (const record of records) {
    try {
      await prisma.approval.upsert({
        where: { id: record.id },
        update: { status: record.status, groupId: record.groupId, approvedAt: (record as any).approvedAt ?? null },
        create: record,
      });
      count++;
    } catch (err: any) {
      console.warn(`   ⚠ 会签审批 ${record.id}: ${err.message}`);
    }
  }

  console.log(`   ✓ 会签审批: ${count} 条已就绪`);
}

// ──────────────────────────────────────────────────────────────────────────
// 6. 顺签审批记录（APPR-010, APPR-011）
// ──────────────────────────────────────────────────────────────────────────
async function seedSequentialApprovals(adminId: string, docIds: string[]): Promise<void> {
  console.log('── 顺签审批记录 (Sequential Approvals)...');

  const docId = docIds.find((id) => id === 'e2e-doc-draft-001') ?? docIds[0];
  if (!docId) {
    console.warn('   ⚠ 无可用文档，跳过顺签审批 seed');
    return;
  }

  const records = [
    { id: 'e2e-appr-seq-pending-001', documentId: docId, approverId: adminId, status: 'pending', approvalType: 'sequential', sequence: 1, groupId: 'e2e-sequential-group-pending', level: 1 },
    { id: 'e2e-appr-seq-waiting-001', documentId: docId, approverId: adminId, status: 'waiting', approvalType: 'sequential', sequence: 2, groupId: 'e2e-sequential-group-pending', level: 2 },
    { id: 'e2e-appr-seq-approved-001', documentId: docId, approverId: adminId, status: 'approved', approvalType: 'sequential', sequence: 1, groupId: 'e2e-sequential-group-approved', level: 1, approvedAt: daysAgo(1) },
    { id: 'e2e-appr-seq-cancelled-001', documentId: docId, approverId: adminId, status: 'cancelled', approvalType: 'sequential', sequence: 1, groupId: 'e2e-sequential-group-cancelled', level: 1 },
  ];

  let count = 0;
  for (const record of records) {
    try {
      await prisma.approval.upsert({
        where: { id: record.id },
        update: { status: record.status, groupId: record.groupId, sequence: record.sequence, approvedAt: (record as any).approvedAt ?? null },
        create: record,
      });
      count++;
    } catch (err: any) {
      console.warn(`   ⚠ 顺签审批 ${record.id}: ${err.message}`);
    }
  }

  console.log(`   ✓ 顺签审批: ${count} 条已就绪`);
}

// ──────────────────────────────────────────────────────────────────────────
// 生产批次与投料（BT 系列）
// ──────────────────────────────────────────────────────────────────────────
async function seedProductionBatches(): Promise<string[]> {
  console.log('── 生产批次与投料 (ProductionBatch / BatchMaterialUsage)...');

  const product = await prisma.product.findFirst({ select: { id: true, name: true } });
  const recipe = await prisma.recipe.findFirst({ select: { id: true, name: true } });
  const materialBatches = await prisma.materialBatch.findMany({
    where: { batchNumber: { in: ['E2E-MB-2026-001', 'E2E-MB-2026-002'] } },
    orderBy: { batchNumber: 'asc' },
  });

  if (!product || !recipe || materialBatches.length < 2) {
    console.warn('   ⚠ 缺少 Product / Recipe / MaterialBatch，跳过生产批次 seed');
    return [];
  }

  const batches = [
    {
      id: 'e2e-batch-001',
      batchNumber: 'E2E-PB-2026-001',
      productId: product.id,
      productName: product.name,
      recipeId: recipe.id,
      recipeName: recipe.name,
      plannedQuantity: 1000,
      actualQuantity: 980,
      productionDate: daysAgo(7),
      status: 'completed' as const,
    },
    {
      id: 'e2e-batch-002',
      batchNumber: 'E2E-PB-2026-002',
      productId: product.id,
      productName: product.name,
      recipeId: recipe.id,
      recipeName: recipe.name,
      plannedQuantity: 800,
      actualQuantity: 790,
      productionDate: daysAgo(3),
      status: 'completed' as const,
    },
  ];

  for (const batch of batches) {
    await prisma.productionBatch.upsert({
      where: { batchNumber: batch.batchNumber },
      update: batch,
      create: batch,
    });
  }

  const usageRows = [
    { productionBatchId: 'e2e-batch-001', materialBatchId: materialBatches[0].id, quantity: 120 },
    { productionBatchId: 'e2e-batch-002', materialBatchId: materialBatches[1].id, quantity: 95 },
  ];

  for (const usage of usageRows) {
    const existing = await prisma.batchMaterialUsage.findUnique({
      where: {
        productionBatchId_materialBatchId: {
          productionBatchId: usage.productionBatchId,
          materialBatchId: usage.materialBatchId,
        },
      },
    });

    if (existing) {
      await prisma.batchMaterialUsage.update({
        where: { id: existing.id },
        data: { quantity: usage.quantity, usedAt: daysAgo(2) },
      });
    } else {
      await prisma.batchMaterialUsage.create({
        data: {
          productionBatchId: usage.productionBatchId,
          materialBatchId: usage.materialBatchId,
          quantity: usage.quantity,
          usedAt: daysAgo(2),
        },
      });
    }
  }

  console.log(`   ✓ 生产批次: ${batches.length} 条，投料: ${usageRows.length} 条已就绪`);
  return batches.map((batch) => batch.id);
}

// ──────────────────────────────────────────────────────────────────────────
// 食品安全链路（CCP / NC / Recall）
// ──────────────────────────────────────────────────────────────────────────
async function seedFoodSafetyChain(adminId: string): Promise<void> {
  console.log('── 食品安全链路 (CCP / NC / Recall)...');

  const productionBatch = await prisma.productionBatch.findUnique({
    where: { id: 'e2e-batch-001' },
    select: { id: true, batchNumber: true, productName: true },
  });

  if (!productionBatch) {
    throw new Error('seedFoodSafetyChain requires ProductionBatch e2e-batch-001');
  }

  const processStep = await prisma.processStep.upsert({
    where: { id: 'e2e-process-step-001' },
    update: {
      company_id: COMPANY_ID,
      step_no: 1,
      step_name: 'E2E 测试工序 001',
      name: 'E2E 测试工序 001',
      is_ccp: true,
      control_measures: 'E2E control measure',
      critical_limit: 'E2E critical limit',
    },
    create: {
      id: 'e2e-process-step-001',
      company_id: COMPANY_ID,
      seq: 1,
      step_no: 1,
      step_name: 'E2E 测试工序 001',
      name: 'E2E 测试工序 001',
      is_ccp: true,
      control_measures: 'E2E control measure',
      critical_limit: 'E2E critical limit',
      monitoring_method: 'E2E temperature check',
      monitoring_frequency: '每批次',
      corrective_action: '隔离并评估批次',
      responsible_person: 'E2E Admin',
    },
  });

  const ccpPoint = await prisma.cCPPoint.upsert({
    where: {
      company_id_ccp_no: {
        company_id: COMPANY_ID,
        ccp_no: 'E2E-CCP-001',
      },
    },
    update: {
      process_step_id: processStep.id,
      hazard_type: 'biological',
      control_measure: 'E2E control measure',
      critical_limit: 'E2E critical limit',
      monitoring_method: 'E2E temperature check',
      monitoring_frequency: '每批次',
      corrective_action: '隔离并评估批次',
    },
    create: {
      id: 'e2e-ccp-point-001',
      company_id: COMPANY_ID,
      ccp_no: 'E2E-CCP-001',
      process_step_id: processStep.id,
      hazard_type: 'biological',
      control_measure: 'E2E control measure',
      critical_limit: 'E2E critical limit',
      monitoring_method: 'E2E temperature check',
      monitoring_frequency: '每批次',
      corrective_action: '隔离并评估批次',
    },
  });

  await prisma.cCPRecord.upsert({
    where: { id: 'e2e-ccp-record-001' },
    update: {
      measured_value: 99.9,
      is_within_cl: false,
      deviation_action: 'E2E 测试：触发不合格品和召回链路',
      operator_id: adminId,
      monitored_at: daysAgo(1),
    },
    create: {
      id: 'e2e-ccp-record-001',
      company_id: COMPANY_ID,
      production_batch_id: productionBatch.id,
      ccp_point_id: ccpPoint.id,
      measured_value: 99.9,
      unit: 'C',
      is_within_cl: false,
      deviation_action: 'E2E 测试：触发不合格品和召回链路',
      operator_id: adminId,
      monitored_at: daysAgo(1),
    },
  });

  await prisma.nonConformance.upsert({
    where: { company_id_nc_no: { company_id: COMPANY_ID, nc_no: 'E2E-NC-FS-001' } },
    update: {
      source_type: 'production_batch',
      source_id: productionBatch.id,
      description: 'E2E 食品安全链路：CCP 偏差自动生成不合格品',
      status: 'open',
    },
    create: {
      company_id: COMPANY_ID,
      nc_no: 'E2E-NC-FS-001',
      source_type: 'production_batch',
      source_id: productionBatch.id,
      nc_type: 'ccp_deviation',
      description: 'E2E 食品安全链路：CCP 偏差自动生成不合格品',
      qty: 10,
      unit: 'kg',
      discovered_at: daysAgo(1),
      discovered_by: adminId,
      status: 'open',
    },
  });

  const recall = await prisma.productRecall.upsert({
    where: { company_id_recall_no: { company_id: COMPANY_ID, recall_no: 'E2E-REC-FS-001' } },
    update: {
      title: 'E2E 食品安全链路召回',
      reason: 'E2E CCP 偏差触发召回',
      risk_level: 'high',
      status: 'pending',
      requested_by: adminId,
    },
    create: {
      id: 'e2e-recall-fs-001',
      company_id: COMPANY_ID,
      recall_no: 'E2E-REC-FS-001',
      title: 'E2E 食品安全链路召回',
      reason: 'E2E CCP 偏差触发召回',
      risk_level: 'high',
      status: 'pending',
      requested_by: adminId,
    },
  });

  await prisma.productRecallBatch.upsert({
    where: {
      recall_id_production_batch_id: {
        recall_id: recall.id,
        production_batch_id: productionBatch.id,
      },
    },
    update: {
      batch_number_snapshot: productionBatch.batchNumber,
      product_name_snapshot: productionBatch.productName,
      affected_qty: 10,
      unit: 'kg',
      status: 'identified',
    },
    create: {
      company_id: COMPANY_ID,
      recall_id: recall.id,
      production_batch_id: productionBatch.id,
      batch_number_snapshot: productionBatch.batchNumber,
      product_name_snapshot: productionBatch.productName,
      affected_qty: 10,
      unit: 'kg',
      status: 'identified',
    },
  });

  console.log('   ✓ 食品安全链路已就绪');
}

// ──────────────────────────────────────────────────────────────────────────
// 7. 成员用户任务实例（TSK-MY-002, BDD-TSK-006）
// ──────────────────────────────────────────────────────────────────────────
async function seedTaskInstances(adminId: string, memberId: string | null): Promise<void> {
  console.log('── 任务实例 (RecordTaskInstance)...');

  const userId = memberId ?? adminId;

  // 需要先有 RecordTemplate
  const template = await prisma.recordTemplate.findFirst({
    where: { status: 'active' },
    select: { id: true },
  });
  if (!template) {
    console.warn('   ⚠ 无活跃 RecordTemplate，跳过任务实例 seed');
    return;
  }

  // 需要先有 Department
  const department = await prisma.department.findFirst({
    select: { id: true },
  });
  if (!department) {
    console.warn('   ⚠ 无部门数据，跳过任务实例 seed');
    return;
  }

  // 查找或创建 RecordTaskAssignment
  let assignment = await prisma.recordTaskAssignment.findFirst({
    where: {
      templateId: template.id,
      departmentId: department.id,
      title: 'E2E 测试填报任务',
    },
  });

  if (!assignment) {
    try {
      assignment = await prisma.recordTaskAssignment.create({
        data: {
          templateId: template.id,
          title: 'E2E 测试填报任务',
          departmentId: department.id,
          isPeriodic: false,
          status: 'active',
          creatorId: adminId,
        },
      });
    } catch (err: any) {
      console.warn(`   ⚠ RecordTaskAssignment 创建失败: ${err.message}`);
      return;
    }
  }

  // 创建任务实例（pending 状态，给成员用户）
  const existingInstance = await prisma.recordTaskInstance.findFirst({
    where: { assignmentId: assignment.id, status: 'pending' },
  });

  if (!existingInstance) {
    try {
      await prisma.recordTaskInstance.create({
        data: {
          assignmentId: assignment.id,
          deadline: daysLater(7),
          status: 'pending',
        },
      });
      console.log('   ✓ 任务实例: 1 条新增 (pending)');
    } catch (err: any) {
      console.warn(`   ⚠ 任务实例创建失败: ${err.message}`);
    }
  } else {
    console.log('   ✓ 任务实例已存在，跳过');
  }

  // 创建 locked 状态任务实例（for BDD-TSK-006）
  const existingLocked = await prisma.recordTaskInstance.findFirst({
    where: { assignmentId: assignment.id, status: 'locked' },
  });

  if (!existingLocked) {
    try {
      await prisma.recordTaskInstance.create({
        data: {
          assignmentId: assignment.id,
          deadline: daysLater(3),
          status: 'locked',
        },
      });
      console.log('   ✓ 任务实例: 1 条新增 (locked)');
    } catch (err: any) {
      // locked may not be a valid status — try submitted instead
      try {
        await prisma.recordTaskInstance.create({
          data: {
            assignmentId: assignment.id,
            deadline: daysLater(3),
            status: 'submitted',
          },
        });
        console.log('   ✓ 任务实例: 1 条新增 (submitted)');
      } catch {
        console.warn(`   ⚠ locked 任务实例创建失败: ${err.message}`);
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 8. 偏差报告（DEV-006 — 状态流转验证）
//    DeviationReport 需要 Record → 尽量使用已有 Record
// ──────────────────────────────────────────────────────────────────────────
async function seedDeviationReports(adminId: string): Promise<void> {
  console.log('── 偏差报告 (DeviationReport)...');

  // DeviationReport 依赖 Record，需查已有记录
  const record = await prisma.record.findFirst({
    select: { id: true, templateId: true },
  });

  if (!record) {
    console.warn('   ⚠ 无 Record 数据，跳过 DeviationReport seed');
    return;
  }

  const deviations = [
    { id: 'e2e-dev-pending-001', status: 'pending' },
    { id: 'e2e-dev-reviewed-001', status: 'reviewed' },
    { id: 'e2e-dev-closed-001', status: 'closed' },
  ];

  let created = 0;
  for (const dev of deviations) {
    const existing = await prisma.deviationReport.findUnique({ where: { id: dev.id } });
    if (!existing) {
      try {
        await prisma.deviationReport.create({
          data: {
            id: dev.id,
            recordId: record.id,
            templateId: record.templateId,
            fieldName: 'temperature',
            expectedValue: '25',
            actualValue: '35',
            toleranceMin: 20,
            toleranceMax: 30,
            deviationAmount: 10,
            deviationRate: 0.4,
            deviationType: 'absolute',
            reason: 'E2E 测试偏差：温度超出控制范围',
            status: dev.status,
            reporterId: adminId,
            reportedAt: daysAgo(3),
          },
        });
        created++;
      } catch (err: any) {
        console.warn(`   ⚠ DeviationReport ${dev.id}: ${err.message}`);
      }
    }
  }

  console.log(`   ✓ 偏差报告: ${created} 条新增`);
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────
async function resetTrainingPlanFixture(adminId: string) {
  const e2eYear = 9000;
  await prisma.trainingPlan.upsert({
    where: { year: e2eYear },
    update: { status: 'pending_approval', title: 'E2E年度培训计划（待审批）' },
    create: {
      year: e2eYear,
      title: 'E2E年度培训计划（待审批）',
      status: 'pending_approval',
      createdBy: adminId,
    },
  });
  console.log('   ✓ E2E TrainingPlan 基线已重置（pending_approval）');
}

async function main() {
  console.log('🌱 E2E Seed — 开始补充测试数据...\n');

  await ensureE2EMemberUser();
  const { adminId, memberId } = await findUserIds();
  console.log(`   admin: ${adminId}, member: ${memberId ?? '(未找到)'}\n`);

  const docIds = await seedDocuments(adminId);
  await seedLoginLogs(adminId);
  await seedEquipmentAndLocations();
  await seedNonConformances();
  await seedProductRecalls(adminId);
  await seedMaterialBatches();
  await seedProductionBatches();
  await seedApprovalDefinitions(adminId);
  await seedCountersignApprovals(adminId, docIds);
  await seedSequentialApprovals(adminId, docIds);
  await seedTaskInstances(adminId, memberId);
  await seedDeviationReports(adminId);
  await seedFoodSafetyChain(adminId);
  await resetTrainingPlanFixture(adminId);

  console.log('\n✅ E2E Seed 完成');
}

main()
  .catch((err) => {
    console.error('❌ E2E Seed 失败:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
