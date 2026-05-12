import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';
export const REQUIRE_DEPARTMENT_ACCESS_KEY = 'requireDepartmentAccess';

export interface DepartmentAccessRequirement {
  departmentParam: string;
  action: string;
  resourceType: string;
}

export const RequirePermission = (key: string) => SetMetadata(REQUIRE_PERMISSION_KEY, key);

export const RequireDepartmentAccess = (requirement: DepartmentAccessRequirement) =>
  SetMetadata(REQUIRE_DEPARTMENT_ACCESS_KEY, requirement);
