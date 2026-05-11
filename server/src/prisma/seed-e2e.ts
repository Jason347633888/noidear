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
    {
      id: 'e2e-doc-draft-001',
      level: 3,
      number: 'E2E-DRAFT-001',
      title: 'E2E 测试草稿文档 001',
      status: 'draft',
    },
    {
      id: 'e2e-doc-draft-002',
      level: 3,
      number: 'E2E-DRAFT-002',
      title: 'E2E 测试草稿文档 002',
      status: 'draft',
    },
    {
      id: 'e2e-doc-effective-001',
      level: 2,
      number: 'E2E-EFF-001',
      title: 'E2E 测试生效文档 001',
      status: 'effective',
    },
    {
      id: 'e2e-doc-effective-002',
      level: 2,
      number: 'E2E-EFF-002',
      title: 'E2E 测试生效文档 002',
      status: 'effective',
    },
    {
      id: 'e2e-doc-pending-001',
      level: 3,
      number: 'E2E-PEND-001',
      title: 'E2E 测试审批中文档 001',
      status: 'pending_approval',
    },
    {
      id: 'e2e-doc-archived-001',
      level: 2,
      number: 'E2E-ARCH-001',
      title: 'E2E 测试已归档文档 001',
      status: 'archived',
    },
  ];

  const created: string[] = [];

  for (const doc of docs) {
    try {
      const existing = await prisma.document.findUnique({ where: { id: doc.id } });
      if (!existing) {
        await prisma.document.create({
          data: {
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
      }
    } catch (err: any) {
      if (err.code !== 'P2002') console.warn(`   ⚠ 文档 ${doc.number}: ${err.message}`);
    }
  }

  console.log(`   ✓ 文档: ${created.length} 条新增`);
  return docs.map((d) => d.id);
}

// ──────────────────────────────────────────────────────────────────────────
// 2. 不合格品 — 各状态（NC-002, NC-004, NC-005）
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

  const groupId = 'e2e-countersign-group-001';
  const existing = await prisma.approval.findFirst({ where: { groupId } });
  if (existing) {
    console.log('   ✓ 会签审批已存在，跳过');
    return;
  }

  try {
    // 创建 3 条会签记录（A1 pending, A2 pending, A3 pending）
    await prisma.approval.createMany({
      data: [
        {
          id: 'e2e-appr-cs-001',
          documentId: docId,
          approverId: adminId,
          status: 'pending',
          approvalType: 'countersign',
          sequence: 0,
          groupId,
          level: 1,
        },
        {
          id: 'e2e-appr-cs-002',
          documentId: docId,
          approverId: adminId,
          status: 'pending',
          approvalType: 'countersign',
          sequence: 0,
          groupId,
          level: 1,
        },
        {
          id: 'e2e-appr-cs-003',
          documentId: docId,
          approverId: adminId,
          status: 'pending',
          approvalType: 'countersign',
          sequence: 0,
          groupId,
          level: 1,
        },
      ],
      skipDuplicates: true,
    });
    console.log('   ✓ 会签审批: 3 条新增');
  } catch (err: any) {
    console.warn(`   ⚠ 会签审批 seed 失败: ${err.message}`);
  }
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

  const groupId = 'e2e-sequential-group-001';
  const existing = await prisma.approval.findFirst({ where: { groupId } });
  if (existing) {
    console.log('   ✓ 顺签审批已存在，跳过');
    return;
  }

  try {
    await prisma.approval.createMany({
      data: [
        {
          id: 'e2e-appr-seq-001',
          documentId: docId,
          approverId: adminId,
          status: 'pending',
          approvalType: 'sequential',
          sequence: 1,
          groupId,
          level: 1,
        },
        {
          id: 'e2e-appr-seq-002',
          documentId: docId,
          approverId: adminId,
          status: 'waiting',
          approvalType: 'sequential',
          sequence: 2,
          groupId,
          level: 2,
        },
        {
          id: 'e2e-appr-seq-003',
          documentId: docId,
          approverId: adminId,
          status: 'waiting',
          approvalType: 'sequential',
          sequence: 3,
          groupId,
          level: 3,
        },
      ],
      skipDuplicates: true,
    });
    console.log('   ✓ 顺签审批: 3 条新增');
  } catch (err: any) {
    console.warn(`   ⚠ 顺签审批 seed 失败: ${err.message}`);
  }
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
async function main() {
  console.log('🌱 E2E Seed — 开始补充测试数据...\n');

  const { adminId, memberId } = await findUserIds();
  console.log(`   admin: ${adminId}, member: ${memberId ?? '(未找到)'}\n`);

  const docIds = await seedDocuments(adminId);
  await seedNonConformances();
  await seedProductRecalls(adminId);
  await seedMaterialBatches();
  await seedCountersignApprovals(adminId, docIds);
  await seedSequentialApprovals(adminId, docIds);
  await seedTaskInstances(adminId, memberId);
  await seedDeviationReports(adminId);

  console.log('\n✅ E2E Seed 完成');
}

main()
  .catch((err) => {
    console.error('❌ E2E Seed 失败:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
