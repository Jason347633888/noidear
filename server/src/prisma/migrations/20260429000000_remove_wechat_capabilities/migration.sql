-- Remove WeChat mini-program login and subscribe-message storage.
-- IF EXISTS keeps deploy tolerant because old environments may not have all artifacts.
DROP INDEX IF EXISTS "users_wechat_openid_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "wechat_openid";
DROP TABLE IF EXISTS "wechat_messages";
