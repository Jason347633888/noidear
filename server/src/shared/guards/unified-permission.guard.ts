import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleService } from '../../modules/role/role.service';
import { DepartmentPermissionService } from '../../modules/department-permission/department-permission.service';
import {
  DepartmentAccessRequirement,
  REQUIRE_DEPARTMENT_ACCESS_KEY,
  REQUIRE_PERMISSION_KEY,
} from '../decorators/require-permission.decorator';

@Injectable()
export class UnifiedPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roleService: RoleService,
    private readonly departmentPermissionService: DepartmentPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionKey = this.reflector.getAllAndOverride<string>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const departmentAccess = this.reflector.getAllAndOverride<DepartmentAccessRequirement>(
      REQUIRE_DEPARTMENT_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissionKey && !departmentAccess) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new UnauthorizedException('未登录');
    if (user.roleCode === 'admin') return true;

    if (permissionKey) {
      const rolePermissions = await this.roleService.getRolePermissions(user.roleId);
      const permissionCodes = rolePermissions.map((permission: any) => permission.code ?? permission.permission?.code);
      if (!permissionCodes.includes(permissionKey)) {
        throw new ForbiddenException(`缺少权限: ${permissionKey}`);
      }
    }

    if (departmentAccess) {
      const departmentId = request.params?.[departmentAccess.departmentParam] ?? request.query?.[departmentAccess.departmentParam];
      if (!departmentId) {
        throw new ForbiddenException(`缺少部门参数: ${departmentAccess.departmentParam}`);
      }
      const allowed = await this.departmentPermissionService.canAccessDepartmentResource(
        user.id,
        departmentId,
        departmentAccess.action,
        departmentAccess.resourceType,
      );
      if (!allowed) {
        throw new ForbiddenException('无权访问该部门资源');
      }
    }

    return true;
  }
}
