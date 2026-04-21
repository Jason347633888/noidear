-- AlterTable
ALTER TABLE "users" ADD COLUMN "wechat_openid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_wechat_openid_key" ON "users"("wechat_openid");
