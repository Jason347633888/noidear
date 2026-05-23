import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { OwnershipContext } from '../../modules/module-access/ownership-context';

const factory = (_: unknown, ctx: ExecutionContext): OwnershipContext =>
  ctx.switchToHttp().getRequest().ownership;

export const Ownership = Object.assign(createParamDecorator(factory), { __factory: factory });
