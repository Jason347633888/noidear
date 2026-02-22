import { SetMetadata } from '@nestjs/common';

export const SENSITIVE_LOG_KEY = 'sensitive_log';

export interface SensitiveLogMetadata {
  action: string;
  resourceType: string;
}

export const SensitiveLog = (action: string, resourceType: string) =>
  SetMetadata(SENSITIVE_LOG_KEY, { action, resourceType } as SensitiveLogMetadata);
