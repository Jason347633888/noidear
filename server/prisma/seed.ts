import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据...');

  // 检查是否已存在
  const existingDept = await prisma.department.findFirst({ where: { code: 'ROOT' } });
  if (existingDept) {
    console.log('数据已存在，跳过初始化');
    return;
  }

  // 创建部门
  const deptId = randomUUID();
  const dept = await prisma.department.create({
    data: {
      id: deptId,
      code: 'ROOT',
      name: '总部',
      parentId: null,
    }
  });
  console.log('创建部门:', dept.name);

  // 创建管理员用户
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminId = randomUUID();
  const admin = await prisma.user.create({
    data: {
      id: adminId,
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      role: 'ADMIN',
      departmentId: dept.id,
      superiorId: null,
    }
  });
  console.log('创建用户:', admin.username);

  console.log('初始化完成!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
