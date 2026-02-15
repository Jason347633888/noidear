const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('\n=== 验证角色权限系统数据 ===\n');

    // 检查角色
    const roles = await prisma.role.findMany({
      orderBy: { code: 'asc' }
    });
    console.log(`✓ 角色数量: ${roles.length}`);
    roles.forEach(role => {
      console.log(`  - ${role.code}: ${role.name} (${role.description})`);
    });

    // 检查权限
    const permissions = await prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }]
    });
    console.log(`\n✓ 权限数量: ${permissions.length}`);
    
    const grouped = {};
    permissions.forEach(perm => {
      if (!grouped[perm.resource]) grouped[perm.resource] = [];
      grouped[perm.resource].push(perm.action);
    });
    
    Object.entries(grouped).forEach(([resource, actions]) => {
      console.log(`  - ${resource}: ${actions.join(', ')}`);
    });

    // 检查角色权限关联
    console.log('\n✓ 角色权限分配:');
    for (const role of roles) {
      const rolePerms = await prisma.rolePermission.findMany({
        where: { roleId: role.id },
        include: { permission: true }
      });
      console.log(`  - ${role.code}: ${rolePerms.length} 个权限`);
      
      const permMap = {};
      rolePerms.forEach(rp => {
        const resource = rp.permission.resource;
        if (!permMap[resource]) permMap[resource] = [];
        permMap[resource].push(rp.permission.action);
      });
      
      Object.entries(permMap).forEach(([resource, actions]) => {
        console.log(`    ${resource}: ${actions.join(', ')}`);
      });
    }

    // 检查User表是否有roleId字段
    const user = await prisma.user.findFirst();
    if (user) {
      console.log(`\n✓ User表roleId字段存在: ${user.roleId !== undefined ? '是' : '否'}`);
      console.log(`✓ User表role字段（向后兼容）: ${user.role}`);
    }

    console.log('\n✅ 验证完成！\n');
  } catch (error) {
    console.error('❌ 验证失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
