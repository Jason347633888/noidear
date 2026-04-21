import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始创建测试组织架构...');

  const testPassword = process.env.SEED_ORG_PASSWORD;
  if (!testPassword) {
    throw new Error('请先设置环境变量 SEED_ORG_PASSWORD，例如：SEED_ORG_PASSWORD=xxx npx ts-node src/prisma/seed-org.ts');
  }
  const pwd = await bcrypt.hash(testPassword, 10);

  // ────────────────────────────────────────────
  // 1. 部门
  // ────────────────────────────────────────────
  const deptDefs = [
    { id: 'dept_warehouse',     code: 'WARE', name: '仓储部' },
    { id: 'dept_marketing',     code: 'MKT',  name: '营销部' },
    { id: 'dept_procurement',   code: 'PUR',  name: '采购部' },
    { id: 'dept_hr',            code: 'HR',   name: '行政人事部' },
    { id: 'dept_quality_ctrl',  code: 'QUAL', name: '品质部' },
    { id: 'dept_rd',            code: 'RD',   name: '产品开发部' },
    { id: 'dept_engineering',   code: 'ENG',  name: '工程部' },
    { id: 'dept_gmo',           code: 'GMO',  name: '总经办' },
    { id: 'dept_manufacturing', code: 'MFG',  name: '制造部' },
  ];

  for (const d of deptDefs) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: { id: d.id, code: d.code, name: d.name, status: 'active' },
    });
  }
  console.log(`✅ 部门创建完成（共 ${deptDefs.length} 个）`);

  // ────────────────────────────────────────────
  // 2. 总经理（顶层，无上级，无部门）
  // ────────────────────────────────────────────
  const ceo = await prisma.user.upsert({
    where: { username: 'ceo' },
    update: {},
    create: {
      id:       'user_ceo',
      username: 'ceo',
      password: pwd,
      name:     '王建华',
      role:     'admin',
      status:   'active',
    },
  });
  console.log('✅ 总经理创建完成（王建华 / ceo）');

  // ────────────────────────────────────────────
  // 3. 各部门：主管 + 下属
  //    主管上级 = 总经理；下属上级 = 主管
  // ────────────────────────────────────────────
  type StaffDef = {
    deptCode:  string;
    leader:    { id: string; username: string; name: string };
    staff:     { id: string; username: string; name: string };
  };

  const staffDefs: StaffDef[] = [
    {
      deptCode: 'WARE',
      leader: { id: 'user_ware_leader', username: 'ware_leader', name: '王大海' },
      staff:  { id: 'user_ware_staff',  username: 'ware_staff',  name: '刘小峰' },
    },
    {
      deptCode: 'MKT',
      leader: { id: 'user_mkt_leader',  username: 'mkt_leader',  name: '陈思远' },
      staff:  { id: 'user_mkt_staff',   username: 'mkt_staff',   name: '赵小燕' },
    },
    {
      deptCode: 'PUR',
      leader: { id: 'user_pur_leader',  username: 'pur_leader',  name: '林志远' },
      staff:  { id: 'user_pur_staff',   username: 'pur_staff',   name: '黄小勇' },
    },
    {
      deptCode: 'HR',
      leader: { id: 'user_hr_leader',   username: 'hr_leader',   name: '郑美玲' },
      staff:  { id: 'user_hr_staff',    username: 'hr_staff',    name: '周小芳' },
    },
    {
      deptCode: 'QUAL',
      leader: { id: 'user_qual_leader', username: 'qual_leader', name: '吴国强' },
      staff:  { id: 'user_qual_staff',  username: 'qual_staff',  name: '孙小涛' },
    },
    {
      deptCode: 'RD',
      leader: { id: 'user_rd_leader',   username: 'rd_leader',   name: '徐志明' },
      staff:  { id: 'user_rd_staff',    username: 'rd_staff',    name: '马晓娟' },
    },
    {
      deptCode: 'ENG',
      leader: { id: 'user_eng_leader',  username: 'eng_leader',  name: '朱大鹏' },
      staff:  { id: 'user_eng_staff',   username: 'eng_staff',   name: '胡小静' },
    },
    {
      deptCode: 'GMO',
      leader: { id: 'user_gmo_leader',  username: 'gmo_leader',  name: '邓秘书长' },
      staff:  { id: 'user_gmo_staff',   username: 'gmo_staff',   name: '唐小助' },
    },
    {
      deptCode: 'MFG',
      leader: { id: 'user_mfg_leader',  username: 'mfg_leader',  name: '蒋海军' },
      staff:  { id: 'user_mfg_staff',   username: 'mfg_staff',   name: '韩小磊' },
    },
  ];

  for (const item of staffDefs) {
    const dept = await prisma.department.findUnique({ where: { code: item.deptCode } });
    if (!dept) {
      console.warn(`⚠️  找不到部门 ${item.deptCode}，跳过`);
      continue;
    }

    // 主管（上级 = 总经理）
    const leader = await prisma.user.upsert({
      where:  { username: item.leader.username },
      update: {},
      create: {
        id:           item.leader.id,
        username:     item.leader.username,
        password:     pwd,
        name:         item.leader.name,
        role:         'leader',
        departmentId: dept.id,
        superiorId:   ceo.id,
        status:       'active',
      },
    });

    // 下属（上级 = 主管）
    await prisma.user.upsert({
      where:  { username: item.staff.username },
      update: {},
      create: {
        id:           item.staff.id,
        username:     item.staff.username,
        password:     pwd,
        name:         item.staff.name,
        role:         'user',
        departmentId: dept.id,
        superiorId:   leader.id,
        status:       'active',
      },
    });

    // 把主管设为部门经理
    await prisma.department.update({
      where: { code: item.deptCode },
      data:  { managerId: leader.id },
    });

    console.log(`  ✅ ${dept.name}：${item.leader.name}（主管）+ ${item.staff.name}（下属）`);
  }

  console.log('\n🎉 组织架构配置完成！共创建 1 名总经理 + 10 个部门 + 20 名员工。');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
