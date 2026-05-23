import { SetMetadata } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { ModuleKey as ModuleKeyType } from '../../modules/module-access/module-access.constants';

export const MODULE_KEY_METADATA = 'module-access:module-key';

export const ModuleKey = (key: ModuleKeyType) => SetMetadata(MODULE_KEY_METADATA, key);

export function getModuleKey(reflector: Reflector, target: any): ModuleKeyType | undefined {
  return reflector.getAllAndOverride<ModuleKeyType | undefined>(MODULE_KEY_METADATA, [
    target,
    target?.constructor,
  ]);
}
