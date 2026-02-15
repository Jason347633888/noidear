const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('开始执行数据库迁移...');

    // 创建roles表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "deletedAt" TIMESTAMP(3),
        CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
      )
    `;
    console.log('✓ 创建roles表');

    // 创建permissions表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" TEXT NOT NULL,
        "resource" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
      )
    `;
    console.log('✓ 创建permissions表');

    // 创建role_permissions表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "id" TEXT NOT NULL,
        "roleId" TEXT NOT NULL,
        "permissionId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
      )
    `;
    console.log('✓ 创建role_permissions表');

    // 添加users表roleId字段
    await prisma.$executeRaw`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roleId" TEXT
    `;
    console.log('✓ 添加users.roleId字段');

    // 创建唯一索引
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "roles_code_key" ON "roles"("code")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "permissions_resource_idx" ON "permissions"("resource")`;
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "permissions_resource_action_key" ON "permissions"("resource", "action")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "role_permissions_roleId_idx" ON "role_permissions"("roleId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "role_permissions_permissionId_idx" ON "role_permissions"("permissionId")`;
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId")`;
    console.log('✓ 创建索引');

    // 添加外键
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_roleId_fkey'
        ) THEN
          ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" 
          FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    console.log('✓ 添加users外键');

    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_roleId_fkey'
        ) THEN
          ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" 
          FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;

    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_permissionId_fkey'
        ) THEN
          ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" 
          FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    console.log('✓ 添加role_permissions外键');

    // 初始化默认角色
    await prisma.$executeRaw`
      INSERT INTO "roles" ("id", "code", "name", "description", "createdAt", "updatedAt")
      VALUES
        ('role_admin_001', 'admin', '管理员', '系统管理员，拥有所有权限', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('role_leader_001', 'leader', '主管', '部门主管，拥有部分管理权限', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('role_user_001', 'user', '普通用户', '普通用户，只读权限', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("code") DO NOTHING
    `;
    console.log('✓ 初始化角色');

    // 初始化权限
    await prisma.$executeRaw`
      INSERT INTO "permissions" ("id", "resource", "action", "description", "createdAt", "updatedAt")
      VALUES
        ('perm_doc_create', 'document', 'create', '创建文档', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('perm_doc_read', 'document', 'read', '读取文档', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('perm_doc_update', 'document', 'update', '更新文档', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('perm_doc_delete', 'document', 'delete', '删除文档', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('perm_tmpl_create', 'template', 'create', '创建模板', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('perm_tmpl_read', 'template', 'read', '读取模板', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('perm_tmpl_update', 'template', 'update', '更新模板', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('perm_tmpl_delete', 'template', 'delete', '删除模板', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('perm_task_create', 'task', 'create', '创建任务', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('perm_task_read', 'task', 'read', '读取任务', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('perm_task_update', 'task', 'update', '更新任务', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('perm_task_delete', 'task', 'delete', '删除任务', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('perm_appr_approve', 'approval', 'approve', '审批操作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("resource", "action") DO NOTHING
    `;
    console.log('✓ 初始化权限');

    // Admin角色分配所有权限
    const permissions = await prisma.$queryRaw`SELECT id FROM permissions`;
    for (const perm of permissions) {
      await prisma.$executeRaw`
        INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
        VALUES (${`rp_admin_${perm.id}`}, 'role_admin_001', ${perm.id}, CURRENT_TIMESTAMP)
        ON CONFLICT ("roleId", "permissionId") DO NOTHING
      `;
    }
    console.log('✓ Admin角色权限分配');

    // Leader角色分配部分权限（除delete外）
    const leaderPerms = await prisma.$queryRaw`SELECT id FROM permissions WHERE action != 'delete'`;
    for (const perm of leaderPerms) {
      await prisma.$executeRaw`
        INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
        VALUES (${`rp_leader_${perm.id}`}, 'role_leader_001', ${perm.id}, CURRENT_TIMESTAMP)
        ON CONFLICT ("roleId", "permissionId") DO NOTHING
      `;
    }
    console.log('✓ Leader角色权限分配');

    // User角色只读权限
    const userPerms = await prisma.$queryRaw`SELECT id FROM permissions WHERE action = 'read'`;
    for (const perm of userPerms) {
      await prisma.$executeRaw`
        INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
        VALUES (${`rp_user_${perm.id}`}, 'role_user_001', ${perm.id}, CURRENT_TIMESTAMP)
        ON CONFLICT ("roleId", "permissionId") DO NOTHING
      `;
    }
    console.log('✓ User角色权限分配');

    console.log('\n✅ 迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
