/**
 * Task 40 — RecipeService write methods admin-only ownership guard
 */
import { ForbiddenException } from '@nestjs/common';
import { RecipeService } from './recipe.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService() {
  const prisma: any = {
    recipe: { create: jest.fn().mockResolvedValue({ id: 'r-1' }) },
    workshopArea: {},
    $transaction: jest.fn().mockImplementation((fn: any) => fn(prisma)),
  };
  return { svc: new RecipeService(prisma), prisma };
}

describe('RecipeService — admin-only write guard', () => {
  beforeEach(() => jest.clearAllMocks());

  const nonAdminRoles: Array<OwnershipContext['roleCode']> = ['leader', 'user'];

  nonAdminRoles.forEach((roleCode) => {
    it(`${roleCode} cannot create recipe — throws ForbiddenException`, async () => {
      const { svc } = freshService();
      const ownership: OwnershipContext = { userId: 'u', roleCode, departmentId: 'd', managedDepartmentIds: [] };
      await expect(svc.createForOwnership({ product_id: 'p', lines: [] } as any, ownership))
        .rejects.toThrow(ForbiddenException);
    });
  });

  it('admin passes ownership guard (may still fail on business rules)', async () => {
    const { svc } = freshService();
    const ownership: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    // Lines validation happens inside; empty lines is expected to cause a business error but NOT a ForbiddenException
    const result = svc.createForOwnership({ product_id: 'p', lines: [] } as any, ownership);
    await expect(result).rejects.not.toThrow(ForbiddenException);
  });
});
