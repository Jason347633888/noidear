import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StatisticsService } from '../../modules/statistics/statistics.service';

/**
 * Interceptor that automatically clears statistics cache
 * after successful data mutation operations (POST, PUT, PATCH, DELETE).
 *
 * Apply to controllers that modify documents, tasks, or approvals
 * to ensure statistics reflect current data.
 */
@Injectable()
export class StatisticsCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(StatisticsCacheInterceptor.name);
  private readonly mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  constructor(private readonly statisticsService: StatisticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    if (!this.mutationMethods.has(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          // Clear cache asynchronously after successful mutation - do not await
          this.statisticsService.clearCaches().catch((err) => {
            this.logger.warn(`Failed to clear statistics cache: ${err.message}`);
          });
        },
      }),
    );
  }
}
