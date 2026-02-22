import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import {
  SENSITIVE_LOG_KEY,
  SensitiveLogMetadata,
} from '../decorators/sensitive-log.decorator';

@Injectable()
export class SensitiveLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SensitiveLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<SensitiveLogMetadata>(
      SENSITIVE_LOG_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const { action, resourceType } = metadata;

    // 使用 tap 在响应后记录日志（非阻塞）
    return next.handle().pipe(
      tap({
        next: (data) => {
          // 异步记录敏感操作日志，失败不影响主流程
          this.recordSensitiveLog(
            user,
            action,
            resourceType,
            request,
            data,
          ).catch((error) => {
            this.logger.error(
              `Failed to record sensitive log: ${error.message}`,
              error.stack,
            );
          });
        },
        error: (error) => {
          // 即使业务操作失败，也记录尝试操作的日志
          this.recordSensitiveLog(
            user,
            action,
            resourceType,
            request,
            null,
            error,
          ).catch((logError) => {
            this.logger.error(
              `Failed to record sensitive log on error: ${logError.message}`,
              logError.stack,
            );
          });
        },
      }),
    );
  }

  private async recordSensitiveLog(
    user: any,
    action: string,
    resourceType: string,
    request: any,
    data?: any,
    error?: any,
  ): Promise<void> {
    try {
      const resourceId = data?.id || request.params?.id || request.query?.id;
      const resourceName =
        data?.name ||
        data?.title ||
        data?.filename ||
        request.body?.name ||
        request.body?.title;

      const details: Record<string, any> = {
        method: request.method,
        url: request.url,
        params: request.params,
        query: request.query,
      };

      if (error) {
        details.error = error.message;
        details.statusCode = error.status || 500;
      }

      await this.auditService.createSensitiveLog({
        userId: user?.id || 'system',
        username: user?.username || 'system',
        action,
        resourceType,
        resourceId: resourceId || 'unknown',
        resourceName: resourceName || 'unknown',
        details,
        ipAddress: this.getClientIp(request),
        userAgent: request.headers['user-agent'] || 'unknown',
      });
    } catch (err) {
      // 只记录日志，不抛出异常
      this.logger.error(
        `Error recording sensitive log: ${err.message}`,
        err.stack,
      );
    }
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }
}
