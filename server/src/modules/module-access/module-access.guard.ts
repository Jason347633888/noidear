import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_KEY_METADATA } from '../../shared/decorators/module-key.decorator';
import { ModuleAccessService } from './module-access.service';

export const MODULE_DISABLED_CODE = 'MODULE_DISABLED';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly service: ModuleAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const klass = context.getClass();
    const moduleKey = this.reflector.getAllAndOverride<string | undefined>(MODULE_KEY_METADATA, [
      handler,
      klass,
    ]);

    if (!moduleKey) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new UnauthorizedException('未登录');
    if (user.roleCode === 'admin') return true;

    const enabled = await this.service.getEnabledModulesFor({ roleCode: user.roleCode });
    if (enabled.includes(moduleKey as any)) return true;

    throw new HttpException(
      { code: MODULE_DISABLED_CODE, module: moduleKey, message: `模块已关闭: ${moduleKey}` },
      HttpStatus.FORBIDDEN,
    );
  }
}
