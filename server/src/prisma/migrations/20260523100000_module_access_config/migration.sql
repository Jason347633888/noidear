-- AddTable
CREATE TABLE "module_access_configs" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "module_access_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "module_access_configs_moduleKey_roleCode_key" ON "module_access_configs"("moduleKey", "roleCode");
CREATE INDEX "module_access_configs_moduleKey_idx" ON "module_access_configs"("moduleKey");
CREATE INDEX "module_access_configs_roleCode_idx" ON "module_access_configs"("roleCode");

-- spec 强制 roleCode 仅 leader|user，模块 key 由应用层校验
ALTER TABLE "module_access_configs"
  ADD CONSTRAINT "module_access_configs_role_chk"
  CHECK ("roleCode" IN ('leader', 'user'));
