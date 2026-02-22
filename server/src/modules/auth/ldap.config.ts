/**
 * LDAP 配置常量与验证工具
 * TASK-402: 真实 LDAP 集成
 */

/** LDAP 相关环境变量键名 */
export const LDAP_ENV_VARS = {
  URL: 'LDAP_URL',
  BIND_DN: 'LDAP_BIND_DN',
  BIND_PASS: 'LDAP_BIND_PASSWORD',
  BASE_DN: 'LDAP_BASE_DN',
} as const;

/** 检查必要的 LDAP 环境变量是否已配置 */
export function validateLdapConfig(): { valid: boolean; missing: string[] } {
  const required = Object.values(LDAP_ENV_VARS);
  const missing = required.filter((key) => !process.env[key]);
  return { valid: missing.length === 0, missing };
}
