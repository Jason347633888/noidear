import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DepartmentPermissionController } from './department-permission.controller';
import { DepartmentPermissionService } from './department-permission.service';

describe('DepartmentPermissionController', () => {
  let controller: DepartmentPermissionController;
  let service: DepartmentPermissionService;

  const mockService = {
    canAccessDepartmentResource: jest.fn(),
    hasCrossDepartmentPermission: jest.fn(),
    getAccessibleDepartments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentPermissionController],
      providers: [
        {
          provide: DepartmentPermissionService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<DepartmentPermissionController>(DepartmentPermissionController);
    service = module.get<DepartmentPermissionService>(DepartmentPermissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAccess', () => {
    it('应该返回用户有权访问的结果', async () => {
      mockService.canAccessDepartmentResource.mockResolvedValue(true);

      const dto = {
        userId: 'user-1',
        departmentId: 'dept-1',
        action: 'view',
        resourceType: 'document',
      };

      const result = await controller.checkAccess(dto);

      expect(result.success).toBe(true);
      expect(result.data.hasAccess).toBe(true);
      expect(result.data.userId).toBe('user-1');
      expect(result.data.departmentId).toBe('dept-1');
      expect(mockService.canAccessDepartmentResource).toHaveBeenCalledWith(
        'user-1',
        'dept-1',
        'view',
        'document',
      );
    });

    it('应该返回用户无权访问的结果', async () => {
      mockService.canAccessDepartmentResource.mockResolvedValue(false);

      const dto = {
        userId: 'user-1',
        departmentId: 'other-dept',
        action: 'delete',
        resourceType: 'document',
      };

      const result = await controller.checkAccess(dto);

      expect(result.success).toBe(true);
      expect(result.data.hasAccess).toBe(false);
    });
  });

  describe('checkCrossDepartment', () => {
    it('应该检查跨部门权限', async () => {
      mockService.hasCrossDepartmentPermission.mockResolvedValue(true);

      const result = await controller.checkCrossDepartment(
        'user-1',
        'view:cross_department:document',
      );

      expect(result.success).toBe(true);
      expect(result.data.hasPermission).toBe(true);
      expect(result.data.userId).toBe('user-1');
      expect(result.data.permissionCode).toBe('view:cross_department:document');
    });

    it('应该在缺少 userId 时抛出 BadRequestException', async () => {
      await expect(
        controller.checkCrossDepartment('', 'view:cross_department:document'),
      ).rejects.toThrow(BadRequestException);
    });

    it('应该在缺少 permissionCode 时抛出 BadRequestException', async () => {
      await expect(
        controller.checkCrossDepartment('user-1', ''),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAccessibleDepartments', () => {
    it('应该返回用户可访问的部门列表', async () => {
      mockService.getAccessibleDepartments.mockResolvedValue(['dept-1', 'dept-2']);

      const result = await controller.getAccessibleDepartments({
        userId: 'user-1',
        resourceType: 'document',
      });

      expect(result.success).toBe(true);
      expect(result.data.departmentIds).toEqual(['dept-1', 'dept-2']);
      expect(result.data.count).toBe(2);
      expect(result.data.resourceType).toBe('document');
    });

    it('应该使用默认 resourceType 为 document', async () => {
      mockService.getAccessibleDepartments.mockResolvedValue(['dept-1']);

      const result = await controller.getAccessibleDepartments({ userId: 'user-1' });

      expect(result.data.resourceType).toBe('document');
      expect(mockService.getAccessibleDepartments).toHaveBeenCalledWith('user-1', 'document');
    });

    it('应该在缺少 userId 时抛出 BadRequestException', async () => {
      await expect(
        controller.getAccessibleDepartments({ userId: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
