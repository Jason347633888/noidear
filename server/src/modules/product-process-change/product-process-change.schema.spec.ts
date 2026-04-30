import { PrismaClient } from '@prisma/client';

describe('product process change schema', () => {
  it('exposes productProcessChangePlan and changeEventExecution delegates', () => {
    const prisma = new PrismaClient();
    expect(prisma.productProcessChangePlan).toBeDefined();
    expect(prisma.changeEventExecution).toBeDefined();
    expect(prisma.changeEventExecutionArtifact).toBeDefined();
  });

  it('exposes CCPPoint.deleted_at', async () => {
    const prisma = new PrismaClient();
    const dummy = prisma.cCPPoint.findFirst({ select: { deleted_at: true } });
    expect(dummy).toBeDefined();
  });
});
