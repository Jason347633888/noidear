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

  // 2. 创建管理员用户
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      id: 'user_admin',
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      role: 'admin',
      status: 'active',
    },
  });

  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  使用默认管理员密码！请在 .env 中设置 ADMIN_PASSWORD');
  }

  console.log('✅ 管理员用户创建完成');

  // 3. 创建细粒度权限定义（TASK-235）
  const permissions = [
    // 文档权限
    {
      id: 'perm_001',
      code: 'view:department:document',
      name: '查看本部门文档',
      category: 'document',
      scope: 'department',
      status: 'active',
      description: '可查看本部门的文档',
    },
    {
      id: 'perm_002',
      code: 'view:cross_department:document',
      name: '跨部门查看文档',
      category: 'document',
      scope: 'cross_department',
      status: 'active',
      description: '可跨部门查看其他部门的文档',
    },
    {
      id: 'perm_003',
      code: 'create:department:document',
      name: '创建本部门文档',
      category: 'document',
      scope: 'department',
      status: 'active',
      description: '可创建本部门的文档',
    },
    {
      id: 'perm_004',
      code: 'edit:department:document',
      name: '编辑本部门文档',
      category: 'document',
      scope: 'department',
      status: 'active',
      description: '可编辑本部门的文档',
    },
    {
      id: 'perm_005',
      code: 'delete:department:document',
      name: '删除本部门文档',
      category: 'document',
      scope: 'department',
      status: 'active',
      description: '可删除本部门的文档',
    },
    // 记录权限
    {
      id: 'perm_006',
      code: 'view:cross_department:record',
      name: '跨部门查看记录',
      category: 'record',
      scope: 'cross_department',
      status: 'active',
      description: '可跨部门查看其他部门的记录',
    },
    {
      id: 'perm_007',
      code: 'fill:cross_department:record',
      name: '跨部门填写记录',
      category: 'record',
      scope: 'cross_department',
      status: 'active',
      description: '可跨部门填写其他部门的记录',
    },
    // 任务权限
    {
      id: 'perm_008',
      code: 'assign:cross_department:task',
      name: '跨部门分配任务',
      category: 'task',
      scope: 'cross_department',
      status: 'active',
      description: '可跨部门分配任务',
    },
    // 审批权限
    {
      id: 'perm_009',
      code: 'approve:cross_department:approval',
      name: '跨部门审批',
      category: 'approval',
      scope: 'cross_department',
      status: 'active',
      description: '可跨部门审批文档和记录',
    },
    // 系统权限
    {
      id: 'perm_010',
      code: 'manage:global:user',
      name: '全局用户管理',
      category: 'system',
      scope: 'global',
      status: 'active',
      description: '可管理所有部门的用户',
    },
    {
      id: 'perm_011',
      code: 'manage:global:role',
      name: '全局角色管理',
      category: 'system',
      scope: 'global',
      status: 'active',
      description: '可管理所有角色和权限',
    },
    {
      id: 'perm_012',
      code: 'manage:global:department',
      name: '全局部门管理',
      category: 'system',
      scope: 'global',
      status: 'active',
      description: '可管理所有部门',
    },
  ];

  for (const permission of permissions) {
    await prisma.fineGrainedPermission.upsert({
      where: { code: permission.code },
      update: {},
      create: permission,
    });
  }

  console.log(`✅ 细粒度权限定义创建完成（共 ${permissions.length} 个）`);

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
          assignments: [{ type: 'role', roleCode: 'gm', label: '总经理' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'document.approvalApproved',
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
            { type: 'role', roleCode: 'quality', label: '品质部' },
            { type: 'role', roleCode: 'manufacture', label: '制造部' },
            { type: 'role', roleCode: 'purchase', label: '采购部' },
            { type: 'role', roleCode: 'development', label: '产品开发部' },
            { type: 'role', roleCode: 'gm', label: '总经理' },
          ],
          rejectPolicy: 'reject_instance',
          onApproved: 'process.stepApproved',
        },
      ],
    },
    {
      module: 'record',
      resourceType: 'record',
      triggerKey: 'submit',
      name: '记录提交审批',
      version: 1,
      steps: [
        {
          stepKey: 'record-submit',
          stepName: '记录审批',
          mode: 'single',
          assignments: [{ type: 'permission', permissionCode: 'approve:record', label: '记录审批人' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'record.submitApproved',
        },
      ],
    },
    {
      module: 'task',
      resourceType: 'task_record',
      triggerKey: 'submit',
      name: '任务记录审批',
      version: 1,
      steps: [
        {
          stepKey: 'task-record-submit',
          stepName: '任务记录审批',
          mode: 'single',
          assignments: [{ type: 'permission', permissionCode: 'approve:task_record', label: '任务记录审批人' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'taskRecord.approvalApproved',
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
          assignments: [{ type: 'permission', permissionCode: 'approve:warehouse', label: '仓储审批人' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'warehouse.requisitionApproved',
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
          assignments: [{ type: 'permission', permissionCode: 'approve:warehouse', label: '仓储审批人' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'warehouse.inboundApproved',
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
          assignments: [{ type: 'permission', permissionCode: 'approve:warehouse', label: '仓储审批人' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'warehouse.returnApproved',
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
          assignments: [{ type: 'permission', permissionCode: 'approve:warehouse', label: '仓储审批人' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'warehouse.scrapApproved',
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
          assignments: [{ type: 'permission', permissionCode: 'approve:training_plan', label: '培训审批人' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'training.planApproved',
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
          assignments: [{ type: 'permission', permissionCode: 'approve:maintenance_record', label: '设备审核人' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'equipment.maintenanceApproved',
        },
      ],
    },
    {
      module: 'audit',
      resourceType: 'audit_finding',
      triggerKey: 'rectification_submitted',
      name: '内审整改复审',
      version: 1,
      steps: [
        {
          stepKey: 'audit-finding-verification',
          stepName: '整改复审',
          mode: 'single',
          assignments: [{ type: 'permission', permissionCode: 'approve:audit_finding', label: '内审复审人' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'audit.findingVerified',
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
          assignments: [{ type: 'permission', permissionCode: 'approve:capa', label: 'CAPA验证人' }],
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
          assignments: [{ type: 'permission', permissionCode: 'approve:deviation', label: '偏离审批人' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'deviation.approvalApproved',
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
          stepKey: 'change-approval',
          stepName: '变更审批',
          mode: 'single',
          assignments: [{ type: 'permission', permissionCode: 'approve:change_event', label: '变更审批人' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'changeEvent.approvalApproved',
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
    { triggerKey: 'step:1', name: '新产品开发申请审批', stepName: '总经理审批', mode: 'single', assignments: [{ type: 'role', roleCode: 'gm', label: '总经理' }] },
    { triggerKey: 'step:2', name: '新产品开发计划审批', stepName: '研发经理审批', mode: 'single', assignments: [{ type: 'role', roleCode: 'manager', label: '研发经理' }] },
    { triggerKey: 'step:5', name: '产品标签信息确认', stepName: '总经理确认', mode: 'single', assignments: [{ type: 'role', roleCode: 'gm', label: '总经理' }] },
    {
      triggerKey: 'step:6', name: '产品操作规程审批', stepName: '品质部+制造部会签', mode: 'countersign_all',
      assignments: [{ type: 'role', roleCode: 'quality', label: '品质部' }, { type: 'role', roleCode: 'manufacture', label: '制造部' }],
    },
    {
      triggerKey: 'step:7', name: '产品验证记录三人会签', stepName: '制造部+品质部+食品安全组长会签', mode: 'countersign_all',
      assignments: [
        { type: 'role', roleCode: 'manufacture', label: '制造部' },
        { type: 'role', roleCode: 'quality', label: '品质部' },
        { type: 'role', roleCode: 'food_safety_leader', label: '食品安全组长' },
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
