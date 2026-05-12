import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UnifiedPermissionGuard } from './unified-permission.guard';
import { RoleService } from '../../modules/role/role.service';
import { DepartmentPermissionService } from '../../modules/department-permission/department-permission.service';

describe('UnifiedPermissionGuard — module DI compilation', () => {
  it('resolves from a module that provides RoleService and DepartmentPermissionService', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UnifiedPermissionGuard,
        Reflector,
        { provide: RoleService, useValue: { getRolePermissions: jest.fn() } },
        { provide: DepartmentPermissionService, useValue: { canAccessDepartmentResource: jest.fn() } },
      ],
    }).compile();

    const guard = moduleRef.get(UnifiedPermissionGuard);
    expect(guard).toBeInstanceOf(UnifiedPermissionGuard);
  });

  it('fails to compile without RoleService', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          UnifiedPermissionGuard,
          Reflector,
          { provide: DepartmentPermissionService, useValue: {} },
        ],
      }).compile(),
    ).rejects.toThrow();
  });

  it('fails to compile without DepartmentPermissionService', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          UnifiedPermissionGuard,
          Reflector,
          { provide: RoleService, useValue: {} },
        ],
      }).compile(),
    ).rejects.toThrow();
  });
});
