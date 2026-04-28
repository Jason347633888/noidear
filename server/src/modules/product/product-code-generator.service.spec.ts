import { ProductCodeGeneratorService } from './product-code-generator.service';

describe('ProductCodeGeneratorService', () => {
  it('按 SystemConfig 配置生成下一个产品编号', async () => {
    const prisma: any = {
      systemConfig: {
        findUnique: jest.fn().mockResolvedValue({ key: 'product.code.format', value: 'CP-{序号}' }),
      },
      product: {
        count: jest.fn().mockResolvedValue(7),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new ProductCodeGeneratorService(prisma);

    await expect(service.generate('1')).resolves.toBe('CP-000008');
    expect(prisma.product.count).toHaveBeenCalledWith({
      where: { company_id: '1', code: { startsWith: 'CP-' } },
    });
  });

  it('配置不存在时使用默认格式', async () => {
    const prisma: any = {
      systemConfig: { findUnique: jest.fn().mockResolvedValue(null) },
      product: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new ProductCodeGeneratorService(prisma);

    await expect(service.generate('1')).resolves.toBe('CP-000001');
  });

  it('生成结果已存在时递增直到可用', async () => {
    const prisma: any = {
      systemConfig: {
        findUnique: jest.fn().mockResolvedValue({ key: 'product.code.format', value: 'CP-{序号}' }),
      },
      product: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'existing' })
          .mockResolvedValueOnce(null),
      },
    };
    const service = new ProductCodeGeneratorService(prisma);

    await expect(service.generate('1')).resolves.toBe('CP-000002');
  });
});
