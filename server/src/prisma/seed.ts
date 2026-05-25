import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始数据库种子数据填充...');

  // 1. 创建部门
  const productionDept = await prisma.department.upsert({
    where: { code: 'PROD' },
    update: {},
    create: {
      id: 'dept_production',
      code: 'PROD',
      name: '生产部',
      status: 'active',
    },
  });

  const qualityDept = await prisma.department.upsert({
    where: { code: 'QA' },
    update: {},
    create: {
      id: 'dept_quality',
      code: 'QA',
      name: '质量部',
      status: 'active',
    },
  });

  console.log('✅ 部门创建完成');

  // 2. 创建系统角色与一个可选部门负责人，保证系统管理页在新库中可直接操作。
  const systemRoles = [
    { id: 'admin', code: 'admin', name: '系统管理员', description: '系统内置管理员角色' },
    { id: 'leader', code: 'leader', name: '部门负责人', description: '系统内置部门负责人角色' },
    { id: 'user', code: 'user', name: '普通用户', description: '系统内置普通用户角色' },
  ];

  for (const role of systemRoles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        deletedAt: null,
      },
      create: role,
    });
  }

  const adminRole = await prisma.role.findFirstOrThrow({ where: { code: 'admin', deletedAt: null } });
  const leaderRole = await prisma.role.findFirstOrThrow({ where: { code: 'leader', deletedAt: null } });

  // 3. 创建管理员用户
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      roleId: adminRole.id,
      status: 'active',
    },
    create: {
      id: 'user_admin',
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      roleId: adminRole.id,
      status: 'active',
    },
  });

  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  使用默认管理员密码！请在 .env 中设置 ADMIN_PASSWORD');
  }

  console.log('✅ 管理员用户创建完成');

  const leaderPassword = await bcrypt.hash('ChangeMe123!', 10);
  await prisma.user.upsert({
    where: { username: 'seed_leader' },
    update: {
      name: '种子负责人',
      roleId: leaderRole.id,
      departmentId: null,
      status: 'active',
    },
    create: {
      id: 'user_seed_leader',
      username: 'seed_leader',
      password: leaderPassword,
      name: '种子负责人',
      roleId: leaderRole.id,
      status: 'active',
      departmentId: null,
    },
  });

  console.log('✅ 系统角色与默认负责人创建完成');

  // 4. 创建物料分类（TASK-181）
  const rawMaterialCategory = await prisma.materialCategory.upsert({
    where: { code: 'RAW' },
    update: {},
    create: {
      id: 'cat_raw_material',
      code: 'RAW',
      name: '原料',
      status: 'active',
      description: '生产用原料',
    },
  });

  const packagingCategory = await prisma.materialCategory.upsert({
    where: { code: 'PKG' },
    update: {},
    create: {
      id: 'cat_packaging',
      code: 'PKG',
      name: '包装材料',
      status: 'active',
      description: '产品包装用材料',
    },
  });

  console.log('✅ 物料分类创建完成');

  // 5. 创建常见物料（TASK-181）
  const materials = [
    {
      id: 'mat_flour',
      materialCode: 'MAT-001',
      name: '面粉',
      specification: '高筋面粉',
      unit: 'kg',
      categoryId: rawMaterialCategory.id,
      shelfLife: 180, // 保质期180天
      safetyStock: 1000,
      status: 'active',
    },
    {
      id: 'mat_sugar',
      materialCode: 'MAT-002',
      name: '糖',
      specification: '白砂糖',
      unit: 'kg',
      categoryId: rawMaterialCategory.id,
      shelfLife: 365,
      safetyStock: 500,
      status: 'active',
    },
    {
      id: 'mat_egg',
      materialCode: 'MAT-003',
      name: '鸡蛋',
      specification: '新鲜鸡蛋',
      unit: 'kg',
      categoryId: rawMaterialCategory.id,
      shelfLife: 30,
      safetyStock: 200,
      status: 'active',
    },
    {
      id: 'mat_box',
      materialCode: 'MAT-101',
      name: '包装盒',
      specification: '标准包装盒',
      unit: 'pcs',
      categoryId: packagingCategory.id,
      shelfLife: null,
      safetyStock: 10000,
      status: 'active',
    },
  ];

  for (const material of materials) {
    await prisma.material.upsert({
      where: { materialCode: material.materialCode },
      update: {},
      create: material,
    });
  }

  console.log(`✅ 常见物料创建完成（共 ${materials.length} 个）`);

  // 6. 创建供应商（TASK-185）
  const suppliers = [
    {
      id: 'sup_001',
      supplierCode: 'SUP-001',
      name: '优质原料供应商A',
      contact: '张三',
      phone: '13800138001',
      address: '广东省广州市',
      status: 'active',
    },
    {
      id: 'sup_002',
      supplierCode: 'SUP-002',
      name: '包装材料供应商B',
      contact: '李四',
      phone: '13800138002',
      address: '浙江省杭州市',
      status: 'active',
    },
  ];

  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: { supplierCode: supplier.supplierCode },
      update: {},
      create: supplier,
    });
  }

  console.log(`✅ 供应商创建完成（共 ${suppliers.length} 个）`);

  // 7. 创建系统配置（TASK-161）
  const configs = [
    {
      id: 'config_batch_format',
      key: 'batch.number.format',
      value: 'BATCH-{YYYYMMDD}-{序号}',
      valueType: 'text',
      category: 'batch',
      description: '批次号生成格式',
    },
    {
      id: 'config_trace_timeout',
      key: 'trace.timeout.hours',
      value: '4',
      valueType: 'number',
      category: 'batch',
      description: '追溯时限（小时，BRCGS要求4小时内）',
    },
    {
      id: 'config_deviation_threshold',
      key: 'balance.deviation.threshold',
      value: '5',
      valueType: 'number',
      category: 'batch',
      description: '物料平衡偏差率预警阈值（%）',
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log(`✅ 系统配置创建完成（共 ${configs.length} 个）`);

  await prisma.systemConfig.upsert({
    where: { key: 'product.code.format' },
    update: {},
    create: {
      key: 'product.code.format',
      value: 'CP-{序号}',
      valueType: 'text',
      category: 'product',
      description: '产品编号格式',
    },
  });

  // 8. 创建产品研发7步流程模板（CX-26）
  const productRd7StepTemplate = {
    name: '产品研发流程（7步）',
    steps: [
      { stepNumber: 1, name: '新产品开发申请书', formCode: 'JL-09', requiredApprovals: [{ role: 'gm', dept: '总经办' }] },
      { stepNumber: 2, name: '新产品开发计划书', formCode: 'JL-10', requiredApprovals: [{ role: 'manager', dept: '产品开发部' }] },
      { stepNumber: 3, name: '研发试验记录', formCode: 'JL-11', requiredApprovals: [] },
      { stepNumber: 4, name: '产品开发评审', formCode: 'JL-01', requiredApprovals: [{ role: 'quality', dept: '品质部' }, { role: 'manufacture', dept: '制造部' }, { role: 'purchase', dept: '采购部' }, { role: 'development', dept: '产品开发部' }, { role: 'gm', dept: '总经办' }] },
      { stepNumber: 5, name: '产品标签信息记录', formCode: 'JL-04', requiredApprovals: [{ role: 'gm', dept: '总经办' }] },
      { stepNumber: 6, name: '产品操作规程', formCode: 'JL-02+JL-06', requiredApprovals: [{ role: 'quality', dept: '品质部' }, { role: 'manufacture', dept: '制造部' }] },
      { stepNumber: 7, name: '产品验证记录', formCode: 'JL-07', requiredApprovals: [{ role: 'manufacture', dept: '制造部' }, { role: 'quality', dept: '品质部' }, { role: 'food_safety_leader', dept: '食品安全小组' }] },
    ],
  };

  await prisma.$transaction(async (tx) => {
    const existing7Step = await tx.processTemplate.findFirst({
      where: { name: productRd7StepTemplate.name },
    });

    if (existing7Step) {
      await tx.processTemplate.update({
        where: { id: existing7Step.id },
        data: { steps: productRd7StepTemplate.steps as any, isActive: true },
      });
      console.log('✅ 已更新产品研发7步流程模板，ID:', existing7Step.id);
    } else {
      await tx.processTemplate.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
      const created = await tx.processTemplate.create({
        data: { ...productRd7StepTemplate, steps: productRd7StepTemplate.steps as any },
      });
      console.log('✅ 已创建产品研发7步流程模板，ID:', created.id);
    }
  });

  console.log('✅ 产品研发流程模板配置完成');

  // 9. 统一审批定义（Unified Approval Definitions）
  const approvalDefinitions = [
    {
      module: 'document',
      resourceType: 'document',
      triggerKey: 'publish.level1',
      name: '一级文件发布审批',
      version: 1,
      steps: [
        {
          stepKey: 'document-level1',
          stepName: '一级文件审批',
          mode: 'sequential',
          assignments: [{ type: 'ROLE', roleCode: 'leader', label: '总经理（placeholder）' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'document.approvalApproved',
          onRejected: 'document.approvalRejected',
        },
      ],
    },
    {
      module: 'document',
      resourceType: 'document',
      triggerKey: 'publish.level2',
      name: '二级文件发布审批',
      version: 1,
      steps: [
        {
          stepKey: 'document-level2',
          stepName: '二级文件审批',
          mode: 'sequential',
          assignments: [{ type: 'ROLE', roleCode: 'leader', label: '部门负责人（placeholder）' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'document.approvalApproved',
          onRejected: 'document.approvalRejected',
        },
      ],
    },
    {
      module: 'document',
      resourceType: 'document',
      triggerKey: 'publish.level3',
      name: '三级文件发布审批',
      version: 1,
      steps: [
        {
          stepKey: 'document-level3',
          stepName: '三级文件审批',
          mode: 'sequential',
          assignments: [{ type: 'ROLE', roleCode: 'leader', label: '部门负责人（placeholder）' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'document.approvalApproved',
          onRejected: 'document.approvalRejected',
        },
      ],
    },
    {
      module: 'process',
      resourceType: 'process_instance',
      triggerKey: 'step:4',
      name: '产品开发评审五部门会签',
      version: 1,
      steps: [
        {
          stepKey: 'process-step4-review',
          stepName: '产品开发评审会签',
          mode: 'countersign_all',
          assignments: [
            { type: 'ROLE', roleCode: 'leader', label: '品质部（placeholder）' },
            { type: 'ROLE', roleCode: 'leader', label: '制造部（placeholder）' },
            { type: 'ROLE', roleCode: 'leader', label: '采购部（placeholder）' },
            { type: 'ROLE', roleCode: 'leader', label: '产品开发部（placeholder）' },
            { type: 'ROLE', roleCode: 'leader', label: '总经理（placeholder）' },
          ],
          rejectPolicy: 'reject_instance',
          onApproved: 'process.stepApproved',
        },
      ],
    },
    {
      module: 'warehouse',
      resourceType: 'material_requisition',
      triggerKey: 'submit',
      name: '领料单审批',
      version: 1,
      steps: [
        {
          stepKey: 'warehouse-requisition',
          stepName: '领料审批',
          mode: 'single',
          assignments: [{ type: 'ROLE', roleCode: 'leader', label: '仓储审批人（placeholder）' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'warehouse.requisitionApproved',
          onRejected: 'warehouse.requisitionRejected',
        },
      ],
    },
    {
      module: 'warehouse',
      resourceType: 'material_inbound',
      triggerKey: 'submit',
      name: '入库单审批',
      version: 1,
      steps: [
        {
          stepKey: 'warehouse-inbound',
          stepName: '入库审批',
          mode: 'single',
          assignments: [{ type: 'ROLE', roleCode: 'leader', label: '仓储审批人（placeholder）' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'warehouse.inboundApproved',
          onRejected: 'warehouse.inboundRejected',
        },
      ],
    },
    {
      module: 'warehouse',
      resourceType: 'material_return',
      triggerKey: 'submit',
      name: '退料单审批',
      version: 1,
      steps: [
        {
          stepKey: 'warehouse-return',
          stepName: '退料审批',
          mode: 'single',
          assignments: [{ type: 'ROLE', roleCode: 'leader', label: '仓储审批人（placeholder）' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'warehouse.returnApproved',
          onRejected: 'warehouse.returnRejected',
        },
      ],
    },
    {
      module: 'warehouse',
      resourceType: 'material_scrap',
      triggerKey: 'submit',
      name: '报废单审批',
      version: 1,
      steps: [
        {
          stepKey: 'warehouse-scrap',
          stepName: '报废审批',
          mode: 'single',
          assignments: [{ type: 'ROLE', roleCode: 'leader', label: '仓储审批人（placeholder）' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'warehouse.scrapApproved',
          onRejected: 'warehouse.scrapRejected',
        },
      ],
    },
    {
      module: 'training',
      resourceType: 'training_plan',
      triggerKey: 'submit',
      name: '培训计划审批',
      version: 1,
      steps: [
        {
          stepKey: 'training-plan',
          stepName: '培训计划审批',
          mode: 'single',
          assignments: [{ type: 'ROLE', roleCode: 'leader', label: '培训审批人（placeholder）' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'training.planApproved',
          onRejected: 'training.planRejected',
        },
      ],
    },
    {
      module: 'equipment',
      resourceType: 'maintenance_record',
      triggerKey: 'submit',
      name: '设备维保审核',
      version: 1,
      steps: [
        {
          stepKey: 'maintenance-record',
          stepName: '维保审核',
          mode: 'single',
          assignments: [{ type: 'ROLE', roleCode: 'leader', label: '设备审核人（placeholder）' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'equipment.maintenanceApproved',
          onRejected: 'equipment.maintenanceRejected',
        },
      ],
    },
    {
      module: 'capa',
      resourceType: 'corrective_action',
      triggerKey: 'verify_close',
      name: 'CAPA验证关闭',
      version: 1,
      steps: [
        {
          stepKey: 'capa-verify-close',
          stepName: 'CAPA验证',
          mode: 'single',
          assignments: [{ type: 'ROLE', roleCode: 'leader', label: 'CAPA验证人（placeholder）' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'capa.verificationApproved',
        },
      ],
    },
    {
      module: 'deviation',
      resourceType: 'deviation_report',
      triggerKey: 'submit',
      name: '偏离报告审批',
      version: 1,
      steps: [
        {
          stepKey: 'deviation-submit',
          stepName: '偏离审批',
          mode: 'single',
          assignments: [{ type: 'ROLE', roleCode: 'leader', label: '偏离审批人（placeholder）' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'deviation.approvalApproved',
          onRejected: 'deviation.approvalRejected',
        },
      ],
    },
    {
      module: 'change',
      resourceType: 'change_event',
      triggerKey: 'approve_change',
      name: '变更审批',
      version: 1,
      steps: [
        {
          stepKey: 'change-event-review',
          stepName: '变更审批',
          mode: 'single',
          assignments: [{ type: 'ROLE', roleCode: 'leader', label: '变更审批人（placeholder）' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'changeEvent.approvalApproved',
          onRejected: 'changeEvent.approvalRejected',
        },
      ],
    },
    {
      module: 'product-recall',
      resourceType: 'product_recall',
      triggerKey: 'submit',
      name: '产品召回审批',
      version: 1,
      steps: [
        {
          stepKey: 'product-recall-review',
          stepName: '召回审批',
          mode: 'single',
          assignments: [{ type: 'ROLE', roleCode: 'leader', label: '召回审批人（placeholder）' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'productRecall.approvalApproved',
          onRejected: 'productRecall.approvalRejected',
        },
      ],
    },
  ];

  for (const definition of approvalDefinitions) {
    await prisma.approvalDefinition.upsert({
      where: {
        module_resourceType_triggerKey_version: {
          module: definition.module,
          resourceType: definition.resourceType,
          triggerKey: definition.triggerKey,
          version: definition.version,
        },
      },
      update: { name: definition.name, steps: definition.steps as any, status: 'active' },
      create: { ...definition, steps: definition.steps as any, status: 'active' },
    });
  }

  // Individual process step definitions (steps 1/2/5 = single approver; 6/7 = countersign_all)
  type StepDef = { triggerKey: string; name: string; stepName: string; mode: string; assignments: { type: string; roleCode: string; label: string }[] };
  const processApprovalDefinitions: StepDef[] = [
    { triggerKey: 'step:1', name: '新产品开发申请审批', stepName: '总经理审批', mode: 'single', assignments: [{ type: 'ROLE', roleCode: 'leader', label: '总经理（placeholder）' }] },
    { triggerKey: 'step:2', name: '新产品开发计划审批', stepName: '研发经理审批', mode: 'single', assignments: [{ type: 'ROLE', roleCode: 'leader', label: '研发经理（placeholder）' }] },
    { triggerKey: 'step:5', name: '产品标签信息确认', stepName: '总经理确认', mode: 'single', assignments: [{ type: 'ROLE', roleCode: 'leader', label: '总经理（placeholder）' }] },
    {
      triggerKey: 'step:6', name: '产品操作规程审批', stepName: '品质部+制造部会签', mode: 'countersign_all',
      assignments: [{ type: 'ROLE', roleCode: 'leader', label: '品质部（placeholder）' }, { type: 'ROLE', roleCode: 'leader', label: '制造部（placeholder）' }],
    },
    {
      triggerKey: 'step:7', name: '产品验证记录三人会签', stepName: '制造部+品质部+食品安全组长会签', mode: 'countersign_all',
      assignments: [
        { type: 'ROLE', roleCode: 'leader', label: '制造部（placeholder）' },
        { type: 'ROLE', roleCode: 'leader', label: '品质部（placeholder）' },
        { type: 'ROLE', roleCode: 'leader', label: '食品安全组长（placeholder）' },
      ],
    },
  ];

  for (const row of processApprovalDefinitions) {
    await prisma.approvalDefinition.upsert({
      where: {
        module_resourceType_triggerKey_version: {
          module: 'process',
          resourceType: 'process_instance',
          triggerKey: row.triggerKey,
          version: 1,
        },
      },
      update: {
        name: row.name,
        status: 'active',
        steps: [
          {
            stepKey: `process-${row.triggerKey}`,
            stepName: row.stepName,
            mode: row.mode,
            assignments: row.assignments,
            rejectPolicy: 'reject_instance',
            onApproved: 'process.stepApproved',
          },
        ] as any,
      },
      create: {
        module: 'process',
        resourceType: 'process_instance',
        triggerKey: row.triggerKey,
        name: row.name,
        version: 1,
        status: 'active',
        steps: [
          {
            stepKey: `process-${row.triggerKey}`,
            stepName: row.stepName,
            mode: row.mode,
            assignments: row.assignments,
            rejectPolicy: 'reject_instance',
            onApproved: 'process.stepApproved',
          },
        ] as any,
      },
    });
  }

  console.log(`✅ 统一审批定义配置完成（共 ${approvalDefinitions.length + processApprovalDefinitions.length} 个）`);
  console.warn('⚠️ Approval definitions seeded with placeholder USER/ROLE assignments; admins must rebuild via UI.');

  // 车间区域基础数据
  const workshopAreas = [
    { code: 'SF', name: '筛粉间', sort_order: 10 },
    { code: 'CY', name: '称油间', sort_order: 20 },
    { code: 'XL', name: '小料房', sort_order: 30 },
    { code: 'GJ', name: '果酱房', sort_order: 40 },
    { code: 'JD', name: '鸡蛋房', sort_order: 50 },
    { code: 'JL', name: '搅料间', sort_order: 60 },
  ];

  for (const area of workshopAreas) {
    await prisma.workshopArea.upsert({
      where: { company_id_code: { company_id: '1', code: area.code } },
      update: { name: area.name, sort_order: area.sort_order, status: 'active' },
      create: { company_id: '1', code: area.code, name: area.name, sort_order: area.sort_order, status: 'active' },
    });
  }

  console.log(`✅ 车间区域创建完成（共 ${workshopAreas.length} 个）`);

  // ── 模块开关默认配置
  const MODULE_KEYS_SEED = [
    'work_execution',
    'document_approval',
    'production_execution',
    'product_rd',
    'quality_compliance',
    'equipment_site',
    'traceability_batch',
    'warehouse',
    'training',
  ] as const;
  const ROLE_CODES_WITH_TOGGLE_SEED = ['leader', 'user'] as const;

  for (const moduleKey of MODULE_KEYS_SEED) {
    for (const roleCode of ROLE_CODES_WITH_TOGGLE_SEED) {
      await prisma.moduleAccessConfig.upsert({
        where: { moduleKey_roleCode: { moduleKey, roleCode } },
        update: {},
        create: { moduleKey, roleCode, enabled: true },
      });
    }
  }
  console.log(`✅ ModuleAccessConfig seeded (${MODULE_KEYS_SEED.length} modules × 2 roles)`);

  console.log('🎉 数据库种子数据填充完成！');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据填充失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
