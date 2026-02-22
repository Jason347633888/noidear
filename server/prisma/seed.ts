import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { nanoid } from 'nanoid';

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

  // 创建默认角色
  console.log('开始创建默认角色...');
  const roles = [
    { code: 'admin', name: '管理员', description: '系统管理员，拥有所有权限' },
    { code: 'leader', name: '主管', description: '部门主管，拥有审批权限' },
    { code: 'user', name: '普通用户', description: '普通员工，基础操作权限' },
  ];

  const createdRoles = [];
  for (const roleData of roles) {
    const role = await prisma.role.create({
      data: {
        id: nanoid(),
        ...roleData,
      },
    });
    createdRoles.push(role);
    console.log(`创建角色: ${role.name} (${role.code})`);
  }

  // 创建默认权限
  console.log('开始创建默认权限...');
  const permissions = [
    // 文档权限
    { resource: 'document', action: 'create', description: '创建文档' },
    { resource: 'document', action: 'read', description: '查看文档' },
    { resource: 'document', action: 'update', description: '更新文档' },
    { resource: 'document', action: 'delete', description: '删除文档' },
    { resource: 'document', action: 'approve', description: '审批文档' },
    // 模板权限
    { resource: 'template', action: 'create', description: '创建模板' },
    { resource: 'template', action: 'read', description: '查看模板' },
    { resource: 'template', action: 'update', description: '更新模板' },
    { resource: 'template', action: 'delete', description: '删除模板' },
    // 任务权限
    { resource: 'task', action: 'create', description: '创建任务' },
    { resource: 'task', action: 'read', description: '查看任务' },
    { resource: 'task', action: 'update', description: '更新任务' },
    // 审批权限
    { resource: 'approval', action: 'approve', description: '审批' },
    { resource: 'approval', action: 'reject', description: '驳回' },
  ];

  const createdPermissions = [];
  for (const permData of permissions) {
    const permission = await prisma.permission.create({
      data: {
        id: nanoid(),
        ...permData,
      },
    });
    createdPermissions.push(permission);
    console.log(`创建权限: ${permission.resource}:${permission.action}`);
  }

  // 为admin角色分配所有权限
  console.log('为admin角色分配所有权限...');
  const adminRole = createdRoles.find(r => r.code === 'admin');
  if (adminRole) {
    for (const permission of createdPermissions) {
      await prisma.rolePermission.create({
        data: {
          id: nanoid(),
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      });
    }
    console.log(`已为admin角色分配 ${createdPermissions.length} 个权限`);
  }

  // 为leader角色分配部分权限（文档审批、任务管理、审批权限）
  console.log('为leader角色分配权限...');
  const leaderRole = createdRoles.find(r => r.code === 'leader');
  if (leaderRole) {
    const leaderPermissions = createdPermissions.filter(p =>
      (p.resource === 'document' && ['read', 'approve'].includes(p.action)) ||
      (p.resource === 'task' && ['create', 'read', 'update'].includes(p.action)) ||
      (p.resource === 'approval')
    );
    for (const permission of leaderPermissions) {
      await prisma.rolePermission.create({
        data: {
          id: nanoid(),
          roleId: leaderRole.id,
          permissionId: permission.id,
        },
      });
    }
    console.log(`已为leader角色分配 ${leaderPermissions.length} 个权限`);
  }

  // 为user角色分配基础权限（读取权限）
  console.log('为user角色分配权限...');
  const userRole = createdRoles.find(r => r.code === 'user');
  if (userRole) {
    const userPermissions = createdPermissions.filter(p => p.action === 'read');
    for (const permission of userPermissions) {
      await prisma.rolePermission.create({
        data: {
          id: nanoid(),
          roleId: userRole.id,
          permissionId: permission.id,
        },
      });
    }
    console.log(`已为user角色分配 ${userPermissions.length} 个权限`);
  }

  // 更新admin用户的roleId
  console.log('更新admin用户的roleId...');
  if (adminRole) {
    await prisma.user.update({
      where: { id: adminId },
      data: { roleId: adminRole.id },
    });
    console.log('admin用户已关联admin角色');
  }

  console.log('初始化完成!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
