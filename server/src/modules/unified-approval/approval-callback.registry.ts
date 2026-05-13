import { Injectable, NotFoundException } from '@nestjs/common';
import type { ApprovalCallback, ApprovalCallbackContext } from './types';

@Injectable()
export class ApprovalCallbackRegistry {
  private readonly callbacks = new Map<string, ApprovalCallback>();

  register(key: string, callback: ApprovalCallback) {
    this.callbacks.set(key, callback);
  }

  has(key: string): boolean {
    return this.callbacks.has(key);
  }

  async invoke(key: string, context: ApprovalCallbackContext) {
    const callback = this.callbacks.get(key);
    if (!callback) {
      throw new NotFoundException(`审批回调未注册: ${key}`);
    }
    await callback(context);
  }
}
