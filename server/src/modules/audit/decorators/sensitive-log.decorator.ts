import { SetMetadata } from '@nestjs/common';

export const SENSITIVE_LOG_KEY = 'sensitive_log';

export interface SensitiveLogOptions {
  /** 从 req.body 中提取并写入 details 的字段白名单 */
  bodyFields?: string[];
  /** 从 req.body 中提取作为 resourceId 的字段名 */
  resourceIdField?: string;
}

export interface SensitiveLogMetadata {
  action: string;
  resourceType: string;
  options?: SensitiveLogOptions;
}

export const SensitiveLog = (
  action: string,
  resourceType: string,
  options?: SensitiveLogOptions,
) =>
  SetMetadata(SENSITIVE_LOG_KEY, { action, resourceType, options } as SensitiveLogMetadata);
