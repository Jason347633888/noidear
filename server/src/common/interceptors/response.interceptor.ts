import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseWrapper<T = unknown> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseWrapper<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseWrapper<T>> {
    return next.handle().pipe(
      map((data) => {
        // 如果已经是被包装的响应，直接返回
        if (data && typeof data === 'object' && 'code' in data) {
          return data as ResponseWrapper<T>;
        }
        return {
          code: 0,
          message: 'success',
          data,
        } as ResponseWrapper<T>;
      }),
    );
  }
}
