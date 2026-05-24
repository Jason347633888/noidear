import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始补充开发环境演示数据...');

  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!admin) {
    console.error('❌ 请先运行 npm run prisma:seed 创建基础数据');
    return;
  }

  console.log('📄 创建文档数据...');
  for (const doc of [
    { id: 'doc_001', level: 1, number: 'QM-001', title: '质量手册', filePath: '/files/qm-001.pdf', fileName: '质量手册.pdf', fileSize: 1024, fileType: 'application/pdf', status: 'active', creatorId: admin.id },
    { id: 'doc_002', level: 2, number: 'QP-001', title: '文件控制程序', filePath: '/files/qp-001.pdf', fileName: '文件控制程序.pdf', fileSize: 2048, fileType: 'application/pdf', status: 'active', creatorId: admin.id },
    { id: 'doc_003', level: 3, number: 'WI-001', title: '温度记录作业指导书', filePath: '/files/wi-001.pdf', fileName: '温度记录作业指导书.pdf', fileSize: 512, fileType: 'application/pdf', status: 'active', creatorId: admin.id },
  ]) {
    await prisma.document.upsert({ where: { id: doc.id }, update: {}, create: doc });
  }

  console.log('📝 创建审计日志...');
  await prisma.loginLog.createMany({
    data: [
      { username: 'admin', action: 'login', ipAddress: '127.0.0.1', userAgent: 'Playwright', status: 'success' },
      { username: 'admin', action: 'login', ipAddress: '192.168.1.1', userAgent: 'Chrome', status: 'success' },
    ] as any,
    skipDuplicates: true,
  });

  console.log('⚠️ 偏离报告需要关联记录，跳过...');

  console.log('🗑️ 创建回收站数据...');
  await prisma.document.upsert({
    where: { id: 'doc_del_001' },
    update: {},
    create: {
      id: 'doc_del_001',
      level: 2,
      number: 'QP-DEL-001',
      title: '已删除的程序文件',
      filePath: '/files/del-001.pdf',
      fileName: '已删除文件.pdf',
      fileSize: 1024,
      fileType: 'application/pdf',
      status: 'deleted',
      creatorId: admin.id,
      deletedAt: new Date(),
    },
  });

  console.log('✅ 开发环境演示数据补充完成！');
}

main()
  .catch((e) => { console.error('❌ Seed 失败:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
