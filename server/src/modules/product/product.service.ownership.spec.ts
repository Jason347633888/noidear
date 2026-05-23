/**
 * Task 40 — ProductService write methods admin-only ownership guard
 */
import { ForbiddenException } from '@nestjs/common';
import { ProductService } from './product.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService() {
  const prisma: any = {
    product: { create: jest.fn().mockResolvedValue({ id: 'p-1' }), findFirst: jest.fn() },
    recipe: {},
    businessDocument: {},
  };
  const storage: any = {};
  const docLink: any = {};
  const codeGen: any = { generate: jest.fn().mockResolvedValue('P-001') };
  const svc = new ProductService(prisma, storage, docLink, codeGen);
  return { svc, prisma };
}

describe('ProductService — admin-only write guard', () => {
  beforeEach(() => jest.clearAllMocks());

  const nonAdminRoles: Array<OwnershipContext['roleCode']> = ['leader', 'user'];

  nonAdminRoles.forEach((roleCode) => {
    it(`${roleCode} cannot create product — throws ForbiddenException`, async () => {
      const { svc } = freshService();
      const ownership: OwnershipContext = { userId: 'u', roleCode, departmentId: 'd', managedDepartmentIds: [] };
      await expect(svc.createForOwnership({ name: 'X' } as any, ownership)).rejects.toThrow(ForbiddenException);
    });
  });

  it('admin can create product', async () => {
    const { svc, prisma } = freshService();
    const ownership: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await svc.createForOwnership({ name: 'X', unit: 'kg' } as any, ownership);
    expect(result).toBeDefined();
    expect(prisma.product.create).toHaveBeenCalled();
  });
});
