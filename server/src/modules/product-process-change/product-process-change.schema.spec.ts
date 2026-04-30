import { PrismaClient } from '@prisma/client';

describe('product process change schema', () => {
  it('exposes productProcessChangePlan and changeEventExecution delegates', () => {
    const prisma = new PrismaClient();
    expect(prisma.productProcessChangePlan).toBeDefined();
    expect(prisma.changeEventExecution).toBeDefined();
    expect(prisma.changeEventExecutionArtifact).toBeDefined();
  });

  it('exposes CCPPoint.deleted_at', () => {
    const prisma = new PrismaClient();
    expect(prisma.cCPPoint).toBeDefined();
    const select: import('@prisma/client').Prisma.CCPPointSelect = { deleted_at: true };
    expect(select.deleted_at).toBe(true);
  });
});
