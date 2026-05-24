/**
 * P0-R3-1 — ProductController replaceReport admin guard
 */
import { ForbiddenException } from '@nestjs/common';
import { ProductController } from './product.controller';
import { OwnershipContext } from '../module-access/ownership-context';

function freshController() {
  const service: any = {
    replaceReport: jest.fn().mockResolvedValue({ id: 'doc-1' }),
    uploadReport: jest.fn().mockResolvedValue({ id: 'doc-2' }),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'p-1' }),
    getWorkbench: jest.fn().mockResolvedValue({}),
    getReports: jest.fn().mockResolvedValue([]),
    createForOwnership: jest.fn().mockResolvedValue({ id: 'p-1' }),
    update: jest.fn().mockResolvedValue({ id: 'p-1' }),
    archive: jest.fn().mockResolvedValue({}),
    remove: jest.fn().mockResolvedValue({}),
    createLegacy: jest.fn().mockResolvedValue({ id: 'p-1' }),
  };
  const ctrl = new ProductController(service);
  return { ctrl, service };
}

describe('ProductController — replaceReport admin guard', () => {
  beforeEach(() => jest.clearAllMocks());

  const nonAdminRoles: Array<OwnershipContext['roleCode']> = ['leader', 'user'];

  nonAdminRoles.forEach((roleCode) => {
    it(`${roleCode} calling replaceReport throws ForbiddenException`, () => {
      const { ctrl } = freshController();
      const ownership: OwnershipContext = { userId: 'u', roleCode, departmentId: 'd', managedDepartmentIds: [] };
      expect(() =>
        ctrl.replaceReport('p-1', 'link-1', {} as any, {} as any, { user: { id: 'u' } }, ownership),
      ).toThrow(ForbiddenException);
    });
  });

  it('admin calling replaceReport succeeds', async () => {
    const { ctrl, service } = freshController();
    const ownership: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const req = { user: { id: 'a' } };
    await ctrl.replaceReport('p-1', 'link-1', {} as any, {} as any, req, ownership);
    expect(service.replaceReport).toHaveBeenCalledWith('p-1', 'link-1', {}, {}, 'a');
  });
});
