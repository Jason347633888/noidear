/**
 * Json 字段类型定义（HIGH-5）
 *
 * 用于验证 PermissionLog 和 SensitiveLog 的 Json 字段
 */

/**
 * 权限变更前后的值类型
 * 可以是权限数组、角色对象或其他权限相关数据
 */
export type PermissionValue = Record<string, any>;

/**
 * 敏感操作详情类型
 * 包含敏感操作的具体信息
 */
export type SensitiveDetails = Record<string, any>;
