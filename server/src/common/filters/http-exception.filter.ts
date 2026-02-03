import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { BusinessException, ErrorCode } from '../exceptions/business.exception';

interface ErrorResponse {
  code: number;
  message: string;
  details?: unknown;
  path?: string;
  timestamp?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let code: number;
    let details: unknown;

    if (exception instanceof BusinessException) {
      status = getStatusFromCode(exception.code);
      message = exception.message;
      code = exception.code;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const obj = exceptionResponse as Record<string, unknown>;
        message = (obj.message as string) || exception.message;
        details = obj.details;
      } else {
        message = exception.message;
      }
      code = ErrorCode.VALIDATION_ERROR + (status - 400);
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message || '内部服务器错误';
      code = ErrorCode.INTERNAL_ERROR;
      details = exception.stack;
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = '内部服务器错误';
      code = ErrorCode.INTERNAL_ERROR;
      this.logger.error(`Unknown error: ${exception}`);
    }

    const errorResponse: ErrorResponse = {
      code,
      message,
      details,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}

function getStatusFromCode(code: number): number {
  if (code >= 400001 && code < 400100) return HttpStatus.BAD_REQUEST;
  if (code >= 401001 && code < 401100) return HttpStatus.UNAUTHORIZED;
  if (code >= 403001 && code < 403100) return HttpStatus.FORBIDDEN;
  if (code >= 404001 && code < 404100) return HttpStatus.NOT_FOUND;
  if (code >= 409001 && code < 409100) return HttpStatus.CONFLICT;
  if (code >= 500001) return HttpStatus.INTERNAL_SERVER_ERROR;
  return HttpStatus.INTERNAL_SERVER_ERROR;
}
