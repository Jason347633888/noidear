import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPANY_ID = '1';
const ADMIN_USER_ID = '0000000000000000001';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 3600 * 1000);
}

async function seedProducts() {
  console.log('── 插入产品...');

  const products = [
    { code: 'PROD-001', name: '椰汁软糖', spec: '500g/袋', net_weight: 500, weight_unit: 'g' },
    { code: 'PROD-002', name: '牛奶软糖', spec: '400g/袋', net_weight: 400, weight_unit: 'g' },
    { code: 'PROD-003', name: '草莓果冻', spec: '200g/杯', net_weight: 200, weight_unit: 'g' },
    { code: 'PROD-004', name: '巧克力夹心饼干', spec: '300g/盒', net_weight: 300, weight_unit: 'g' },
    { code: 'PROD-005', name: '芒果布丁', spec: '150g/杯', net_weight: 150, weight_unit: 'g' },
  ];

  const created: Array<{ id: string; code: string; name: string }> = [];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { company_id_code: { company_id: COMPANY_ID, code: p.code } },
      update: {},
      create: {
        company_id: COMPANY_ID,
        code: p.code,
        name: p.name,
        spec: p.spec,
        net_weight: p.net_weight,
        weight_unit: p.weight_unit,
        status: 'active',
      },
    });
    created.push(product);
  }

  console.log(`   ✓ 产品: ${created.length} 条`);
  return created;
}

async function seedRecipes(products: Array<{ id: string; code: string; name: string }>) {
  console.log('── 插入配方...');

  const created: Array<{ id: string; product_id: string }> = [];

  for (const product of products) {
    const recipe = await prisma.recipe.upsert({
      where: { company_id_product_id_version: { company_id: COMPANY_ID, product_id: product.id, version: 1 } },
      update: {},
      create: {
        company_id: COMPANY_ID,
        product_id: product.id,
        version: 1,
        version_note: '初始版本',
        status: 'active',
        approved_by: '系统管理员',
        approved_at: new Date(),
      },
    });
    created.push(recipe);
  }

  console.log(`   ✓ 配方: ${created.length} 条`);
  return created;
}

async function seedShiftInstances() {
  console.log('── 插入班次实例（最近7天）...');

  const shiftTypes = ['白班', '夜班'];
  const created: Array<{ id: string; shift_date: Date; shift_type: string; status: string }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const shiftDate = daysAgo(dayOffset);
    const isToday = dayOffset === 0;

    for (const shiftType of shiftTypes) {
      try {
        const instance = await prisma.shiftInstance.upsert({
          where: {
            company_id_shift_type_shift_date: {
              company_id: COMPANY_ID,
              shift_type: shiftType,
              shift_date: shiftDate,
            },
          },
          update: {},
          create: {
            company_id: COMPANY_ID,
            shift_type: shiftType,
            shift_date: shiftDate,
            opened_by: ADMIN_USER_ID,
            closed_by: isToday ? null : ADMIN_USER_ID,
            opened_at: new Date(shiftDate.getTime() + (shiftType === '白班' ? 8 : 20) * 3600 * 1000),
            closed_at: isToday ? null : new Date(shiftDate.getTime() + (shiftType === '白班' ? 17 : 29) * 3600 * 1000),
            status: isToday ? 'open' : 'closed',
          },
        });
        created.push(instance);
      } catch (err: any) {
        // Skip if unique constraint fails due to date type issues
        if (!err.message?.includes('Unique constraint')) {
          throw err;
        }
      }
    }
  }

  console.log(`   ✓ 班次实例: ${created.length} 条`);
  return created;
}

async function seedProductionRuns(
  shiftInstances: Array<{ id: string; shift_date: Date; shift_type: string; status: string }>,
  products: Array<{ id: string; code: string; name: string }>,
  recipes: Array<{ id: string; product_id: string }>,
) {
  console.log('── 插入生产运行...');

  const lines = ['一号生产线', '二号生产线'];
  const created: Array<{ id: string; status: string }> = [];

  for (const shift of shiftInstances) {
    const isOpen = shift.status === 'open';
    const productIndex = Math.abs(shift.id.charCodeAt(0)) % products.length;
    const product = products[productIndex];
    const recipe = recipes.find(r => r.product_id === product.id);
    const line = lines[productIndex % lines.length];

    const shiftStart = new Date(shift.shift_date);
    shiftStart.setHours(shift.shift_type === '白班' ? 8 : 20, 0, 0, 0);

    // Check if one already exists for this shift/product/line combination
    const existing = await prisma.productionRun.findFirst({
      where: {
        company_id: COMPANY_ID,
        shift_instance_id: shift.id,
        product_id: product.id,
        production_line: line,
      },
    });

    if (!existing) {
      const run = await prisma.productionRun.create({
        data: {
          company_id: COMPANY_ID,
          shift_instance_id: shift.id,
          product_id: product.id,
          recipe_id: recipe?.id ?? null,
          production_line: line,
          started_at: shiftStart,
          ended_at: isOpen ? null : new Date(shiftStart.getTime() + 8 * 3600 * 1000),
          status: isOpen ? 'active' : 'closed',
          actual_yield: isOpen ? null : 850,
          yield_unit: 'kg',
          notes: `${shift.shift_type} ${product.name} 生产`,
        },
      });
      created.push(run);
    }
  }

  console.log(`   ✓ 生产运行: ${created.length} 条`);
  return created;
}

async function seedRecords(
  productionRuns: Array<{ id: string; status: string }>,
  shiftInstances: Array<{ id: string; status: string }>,
) {
  console.log('── 插入记录（关联已有模板）...');

  const templates = await prisma.recordTemplate.findMany({
    take: 10,
    select: { id: true, code: true, name: true },
  });

  if (templates.length === 0) {
    console.log('   ⚠ 未找到 RecordTemplate，跳过 Record 插入');
    return [];
  }

  const created: string[] = [];
  let counter = 1;

  for (const run of productionRuns.slice(0, 6)) {
    const template = templates[counter % templates.length];
    const shift = shiftInstances.find(s => s.status === run.status) ?? shiftInstances[0];

    const existing = await prisma.record.findFirst({
      where: { production_run_id: run.id, templateId: template.id },
    });

    if (!existing) {
      const record = await prisma.record.create({
        data: {
          templateId: template.id,
          number: `REC-${Date.now()}-${counter}`,
          dataJson: {
            filled_by: '系统管理员',
            note: `测试数据：${template.name}`,
          },
          status: 'submitted',
          createdBy: ADMIN_USER_ID,
          submittedAt: new Date(),
          production_run_id: run.id,
          shift_instance_id: shift.id,
        },
      });
      created.push(record.id);
    }

    counter++;
  }

  console.log(`   ✓ 记录: ${created.length} 条`);
  return created;
}

async function seedNonConformances() {
  console.log('── 插入不合格品...');

  const ncs = [
    {
      nc_no: 'NC-2026-001',
      source_type: 'production_batch',
      source_id: 'test-batch-001',
      nc_type: 'physical',
      description: '椰汁软糖发现金属异物，已隔离处理',
      qty: 5.5,
      unit: 'kg',
      discovered_at: daysAgo(5),
      discovered_by: '品质检验员',
      disposition: 'destroy',
      status: 'closed',
      disposition_at: daysAgo(4),
    },
    {
      nc_no: 'NC-2026-002',
      source_type: 'material_batch',
      source_id: 'test-material-001',
      nc_type: 'biological',
      description: '牛奶原料菌落总数超标，退回供应商',
      qty: 200,
      unit: 'kg',
      discovered_at: daysAgo(3),
      discovered_by: '质检组长',
      disposition: 'return',
      status: 'dispositioned',
    },
    {
      nc_no: 'NC-2026-003',
      source_type: 'product',
      source_id: 'test-product-003',
      nc_type: 'labeling',
      description: '草莓果冻包装标签日期打印错误',
      qty: 120,
      unit: '杯',
      discovered_at: daysAgo(1),
      discovered_by: '包装组长',
      disposition: 'rework',
      status: 'open',
    },
    {
      nc_no: 'NC-2026-004',
      source_type: 'production_batch',
      source_id: 'test-batch-002',
      nc_type: 'sensory',
      description: '芒果布丁颜色异常，外观不符合标准',
      qty: 80,
      unit: '杯',
      discovered_at: daysAgo(2),
      discovered_by: '品检员',
      disposition: 'concession',
      status: 'open',
    },
    {
      nc_no: 'NC-2026-005',
      source_type: 'material_batch',
      source_id: 'test-material-002',
      nc_type: 'chemical',
      description: '可可粉农残检测超限，待处置',
      qty: 50,
      unit: 'kg',
      discovered_at: new Date(),
      discovered_by: '实验室',
      status: 'open',
    },
  ];

  const created: Array<{ id: string; nc_no: string }> = [];

  for (const nc of ncs) {
    try {
      const record = await prisma.nonConformance.upsert({
        where: { company_id_nc_no: { company_id: COMPANY_ID, nc_no: nc.nc_no } },
        update: {},
        create: {
          company_id: COMPANY_ID,
          nc_no: nc.nc_no,
          source_type: nc.source_type,
          source_id: nc.source_id,
          nc_type: nc.nc_type ?? null,
          description: nc.description,
          qty: nc.qty ?? null,
          unit: nc.unit ?? null,
          discovered_at: nc.discovered_at,
          discovered_by: nc.discovered_by ?? null,
          disposition: nc.disposition ?? null,
          disposition_by: nc.disposition ? '品质部经理' : null,
          disposition_at: nc.disposition_at ?? null,
          status: nc.status,
        },
      });
      created.push(record);
    } catch (err: any) {
      console.warn(`   ⚠ 跳过 NC ${nc.nc_no}: ${err.message}`);
    }
  }

  console.log(`   ✓ 不合格品: ${created.length} 条`);
  return created;
}

async function seedCorrectiveActions(ncs: Array<{ id: string; nc_no: string }>) {
  console.log('── 插入纠正措施...');

  const capas = [
    {
      capa_no: 'CAPA-2026-001',
      trigger_type: 'non_conformance',
      trigger_id: ncs[0]?.id,
      description: '针对金属异物事件实施全面整改',
      root_cause: '金属探测仪校准频率不足，且维保记录缺失',
      corrective_action: '1. 立即重新校准金属探测仪；2. 增加每班检测记录；3. 落实日常保养制度',
      preventive_action: '修订《金属探测仪操作规程》，明确校准周期和记录要求',
      due_date: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      responsible_id: ADMIN_USER_ID,
      status: 'implementing',
    },
    {
      capa_no: 'CAPA-2026-002',
      trigger_type: 'non_conformance',
      trigger_id: ncs[1]?.id,
      description: '牛奶原料微生物超标的纠正预防措施',
      root_cause: '供应商冷链运输管理不到位，到货温度超过规定范围',
      corrective_action: '1. 对该批次原料退货处理；2. 要求供应商提供整改报告',
      preventive_action: '完善供应商评估标准，增加冷链运输温度验收要求',
      due_date: new Date(Date.now() + 21 * 24 * 3600 * 1000),
      responsible_id: ADMIN_USER_ID,
      status: 'open',
    },
    {
      capa_no: 'CAPA-2026-003',
      trigger_type: 'internal_audit',
      description: '内审发现记录填写不规范的整改',
      root_cause: '员工对记录要求培训不到位，自检意识薄弱',
      corrective_action: '开展全员记录填写规范专项培训',
      preventive_action: '建立记录抽查机制，每周由品质部随机抽查',
      due_date: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      responsible_id: ADMIN_USER_ID,
      status: 'pending_verification',
      verified_by: ADMIN_USER_ID,
      verified_at: new Date(),
    },
  ];

  const created: string[] = [];

  for (const capa of capas) {
    try {
      const record = await prisma.correctiveAction.upsert({
        where: { company_id_capa_no: { company_id: COMPANY_ID, capa_no: capa.capa_no } },
        update: {},
        create: {
          company_id: COMPANY_ID,
          capa_no: capa.capa_no,
          trigger_type: capa.trigger_type,
          trigger_id: capa.trigger_id ?? null,
          description: capa.description,
          root_cause: capa.root_cause ?? null,
          corrective_action: capa.corrective_action ?? null,
          preventive_action: capa.preventive_action ?? null,
          due_date: capa.due_date ?? null,
          responsible_id: capa.responsible_id ?? null,
          status: capa.status,
          verified_by: capa.verified_by ?? null,
          verified_at: capa.verified_at ?? null,
          closed_at: capa.status === 'closed' ? new Date() : null,
        },
      });
      created.push(record.id);
    } catch (err: any) {
      console.warn(`   ⚠ 跳过 CAPA ${capa.capa_no}: ${err.message}`);
    }
  }

  console.log(`   ✓ 纠正措施: ${created.length} 条`);
  return created;
}

async function seedDocuments() {
  console.log('── 插入文件...');

  const docs = [
    {
      id: 'test-doc-001',
      level: 2,
      number: 'GRSS-CX-TEST-01',
      title: '食品安全手册（测试版）',
      doc_code: 'GRSS-CX-TEST-01',
      doc_level: 'level2',
      status: 'effective',
      fill_frequency: '每年',
      retention_years: 5,
    },
    {
      id: 'test-doc-002',
      level: 3,
      number: 'GRSS-ZZ-ZD-TEST-01',
      title: '生产线清洁作业指导书（测试版）',
      doc_code: 'GRSS-ZZ-ZD-TEST-01',
      doc_level: 'level3',
      status: 'approved',
      fill_frequency: '每班',
      retention_years: 3,
    },
    {
      id: 'test-doc-003',
      level: 4,
      number: 'GRSS-PZ-JL-TEST-01',
      title: '成品检验记录表（测试版）',
      doc_code: 'GRSS-PZ-JL-TEST-01',
      doc_level: 'level4',
      status: 'draft',
      fill_frequency: '每批次',
      retention_years: 3,
    },
    {
      id: 'test-doc-004',
      level: 2,
      number: 'GRSS-CX-TEST-02',
      title: '供应商管理程序（测试版）',
      doc_code: 'GRSS-CX-TEST-02',
      doc_level: 'level2',
      status: 'effective',
      fill_frequency: '每年',
      retention_years: 5,
    },
    {
      id: 'test-doc-005',
      level: 3,
      number: 'GRSS-PZ-ZD-TEST-01',
      title: 'CCP监控操作规程（测试版）',
      doc_code: 'GRSS-PZ-ZD-TEST-01',
      doc_level: 'level3',
      status: 'approved',
      fill_frequency: '每班',
      retention_years: 5,
    },
  ];

  const created: string[] = [];

  for (const doc of docs) {
    const existing = await prisma.document.findUnique({ where: { id: doc.id } });
    if (!existing) {
      try {
        await prisma.document.create({
          data: {
            id: doc.id,
            level: doc.level,
            number: doc.number,
            title: doc.title,
            filePath: `/test-files/${doc.number}.pdf`,
            fileName: `${doc.number}.pdf`,
            fileSize: 102400,
            fileType: 'application/pdf',
            version: 1.0,
            status: doc.status,
            creatorId: ADMIN_USER_ID,
            approverId: doc.status !== 'draft' ? ADMIN_USER_ID : null,
            approvedAt: doc.status !== 'draft' ? daysAgo(7) : null,
            doc_code: doc.doc_code,
            doc_level: doc.doc_level,
            fill_frequency: doc.fill_frequency,
            retention_years: doc.retention_years,
            effective_date: doc.status === 'effective' ? daysAgo(30) : null,
            content_md: `# ${doc.title}\n\n本文件为测试用途，请勿用于实际业务。`,
          },
        });
        created.push(doc.id);
      } catch (err: any) {
        // Handle duplicate number
        if (err.code === 'P2002') {
          console.warn(`   ⚠ 文件编号 ${doc.number} 已存在，跳过`);
        } else {
          console.warn(`   ⚠ 跳过文件 ${doc.number}: ${err.message}`);
        }
      }
    }
  }

  console.log(`   ✓ 文件: ${created.length} 条`);
  return created;
}

async function main() {
  console.log('🌱 开始插入测试数据...\n');

  const products = await seedProducts();
  const recipes = await seedRecipes(products);
  const shiftInstances = await seedShiftInstances();
  const productionRuns = await seedProductionRuns(shiftInstances, products, recipes);
  await seedRecords(productionRuns, shiftInstances);
  const ncs = await seedNonConformances();
  await seedCorrectiveActions(ncs);
  await seedDocuments();

  console.log('\n✅ 测试数据插入完成');
}

main().catch(err => {
  console.error('❌ 插入失败:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
