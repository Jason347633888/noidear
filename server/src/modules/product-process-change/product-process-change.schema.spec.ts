import { PrismaClient } from '@prisma/client';

describe('product process change schema', () => {
  it('exposes productProcessChangePlan and changeEventExecution delegates', () => {
    const prisma = new PrismaClient();
    expect(prisma.productProcessChangePlan).toBeDefined();
    expect(prisma.changeEventExecution).toBeDefined();
    expect(prisma.changeEventExecutionArtifact).toBeDefined();
  });
});
