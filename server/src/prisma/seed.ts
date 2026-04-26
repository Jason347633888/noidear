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
