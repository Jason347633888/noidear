import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * P0-4: 服务器时间戳强制覆盖拦截器（BRCGS 合规）
 *
 * 检查客户端时间与服务器时间差异:
 * - 差 > 5 分钟: 拒绝请求
 * - 差 <= 5 分钟: 使用服务器时间覆盖客户端时间
 *
 * 使用方式：
 * @UseInterceptors(TimestampValidationInterceptor)
 */
@Injectable()
export class TimestampValidationInterceptor implements NestInterceptor {
  private readonly MAX_TIME_DIFF_MS = 5 * 60 * 1000; // 5 分钟

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    if (body && body.clientTimestamp) {
      const clientTime = new Date(body.clientTimestamp).getTime();
      const serverTime = Date.now();
      const diff = Math.abs(serverTime - clientTime);

      if (diff > this.MAX_TIME_DIFF_MS) {
        throw new BadRequestException(
          `客户端时间与服务器时间差异过大（${Math.round(diff / 1000)}秒），请检查系统时钟。BRCGS 合规要求时间差不超过 5 分钟。`,
        );
      }

      // 强制使用服务器时间覆盖客户端时间
      body.serverTimestamp = new Date().toISOString();
      delete body.clientTimestamp;
    }

    return next.handle();
  }
}
