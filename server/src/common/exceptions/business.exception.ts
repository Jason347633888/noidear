// 自定义异常类

import { HttpStatus } from '@nestjs/common';

export enum ErrorCode {
  SUCCESS = 0,
  VALIDATION_ERROR = 400001,
  UNAUTHORIZED = 401001,
  FORBIDDEN = 403001,
  NOT_FOUND = 404001,
  CONFLICT = 409001,
  INTERNAL_ERROR = 500001,
  DATABASE_ERROR = 500002,
}

export interface ErrorResponse {
  code: number;
  message: string;
  details?: unknown;
}

export class BusinessException extends Error {
  constructor(
    public readonly code: number,
    public readonly message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function getHttpStatus(code: number): HttpStatus {
  if (code >= 400001 && code < 400100) return HttpStatus.BAD_REQUEST;
  if (code >= 401001 && code < 401100) return HttpStatus.UNAUTHORIZED;
  if (code >= 403001 && code < 403100) return HttpStatus.FORBIDDEN;
  if (code >= 404001 && code < 404100) return HttpStatus.NOT_FOUND;
  if (code >= 409001 && code < 409100) return HttpStatus.CONFLICT;
  if (code >= 500001) return HttpStatus.INTERNAL_SERVER_ERROR;
  return HttpStatus.INTERNAL_SERVER_ERROR;
}
