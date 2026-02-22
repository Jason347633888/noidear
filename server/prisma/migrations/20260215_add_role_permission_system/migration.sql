-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "roleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "permissions_resource_idx" ON "permissions"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 初始化默认角色
INSERT INTO "roles" ("id", "code", "name", "description", "createdAt", "updatedAt") VALUES
    ('role_admin_001', 'admin', '管理员', '系统管理员，拥有所有权限', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role_leader_001', 'leader', '主管', '部门主管，拥有部分管理权限', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role_user_001', 'user', '普通用户', '普通用户，只读权限', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 初始化权限
INSERT INTO "permissions" ("id", "resource", "action", "description", "createdAt", "updatedAt") VALUES
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
    ('perm_appr_approve', 'approval', 'approve', '审批操作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Admin角色分配所有权限
INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT 
    'rp_admin_' || "id", 
    'role_admin_001', 
    "id", 
    CURRENT_TIMESTAMP
FROM "permissions";

-- Leader角色分配部分权限（除delete外）
INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT 
    'rp_leader_' || "id", 
    'role_leader_001', 
    "id", 
    CURRENT_TIMESTAMP
FROM "permissions"
WHERE "action" != 'delete';

-- User角色只读权限
INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT 
    'rp_user_' || "id", 
    'role_user_001', 
    "id", 
    CURRENT_TIMESTAMP
FROM "permissions"
WHERE "action" = 'read';
