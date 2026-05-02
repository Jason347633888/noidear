import { NotFoundException } from '@nestjs/common';
import { CustomerComplaintService } from './customer-complaint.service';

describe('CustomerComplaintService', () => {
  const prisma = {
    customerComplaint: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    productionBatch: {
      findUnique: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    externalParty: {
      findFirst: jest.fn(),
    },
  };
  let service: CustomerComplaintService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CustomerComplaintService(prisma as any);
  });

  it('rejects creation when production_batch_id is missing', async () => {
    await expect(
      service.create(
        {
          customer_name: '客户',
          description: '投诉',
        } as any,
        '2',
      ),
    ).rejects.toThrow('生产批次不能为空');

    expect(prisma.productionBatch.findUnique).not.toHaveBeenCalled();
    expect(prisma.customerComplaint.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the production batch does not exist', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        {
          customer_name: '客户',
          production_batch_id: 'missing-batch',
          description: '投诉',
        } as any,
        '2',
      ),
    ).rejects.toThrow('生产批次不存在或不属于当前公司');

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-batch' },
      select: { id: true, productId: true },
    });
    expect(prisma.product.findFirst).not.toHaveBeenCalled();
    expect(prisma.customerComplaint.create).not.toHaveBeenCalled();
  });

  it('rejects creation when production batch belongs to a different company', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({ id: 'other-company-batch', productId: 'prod-x' });
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          customer_name: '客户',
          production_batch_id: 'other-company-batch',
          description: '投诉',
        } as any,
        'company-A',
      ),
    ).rejects.toThrow('生产批次不存在或不属于当前公司');

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'other-company-batch' },
      select: { id: true, productId: true },
    });
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod-x', company_id: 'company-A' },
      select: { id: true },
    });
    expect(prisma.customerComplaint.create).not.toHaveBeenCalled();
  });

  it('rejects creation when customer_id is missing after batch validation passes', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({ id: 'batch-1', productId: 'prod-1' });
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });

    await expect(
      service.create(
        {
          customer_name: '客户',
          production_batch_id: 'batch-1',
          description: '投诉',
        } as any,
        '2',
      ),
    ).rejects.toThrow('客户不能为空');

    expect(prisma.externalParty.findFirst).not.toHaveBeenCalled();
    expect(prisma.customerComplaint.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the customer does not belong to the current company or is unavailable', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({ id: 'batch-1', productId: 'prod-1' });
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
    prisma.externalParty.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          customer_id: 'missing-customer',
          production_batch_id: 'batch-1',
          description: '投诉',
        } as any,
        '2',
      ),
    ).rejects.toThrow('客户不存在或不可用');

    expect(prisma.externalParty.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'missing-customer',
        company_id: '2',
        party_type: 'customer',
        status: 'active',
        deleted_at: null,
      },
      select: { id: true, name: true },
    });
    expect(prisma.customerComplaint.create).not.toHaveBeenCalled();
  });

  it('scopes complaint numbering and writes by company', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({ id: 'batch-1', productId: 'prod-1' });
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
    prisma.externalParty.findFirst.mockResolvedValue({ id: 'cust-1', name: '客户A' });
    prisma.customerComplaint.count.mockResolvedValue(5);
    prisma.customerComplaint.create.mockResolvedValue({ id: 'cc1' });

    await service.create(
      {
        customer_id: 'cust-1',
        customer_name: '不应信任的手填名称',
        production_batch_id: 'batch-1',
        description: '投诉',
      } as any,
      '2',
    );

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      select: { id: true, productId: true },
    });
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod-1', company_id: '2' },
      select: { id: true },
    });
    expect(prisma.externalParty.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'cust-1',
        company_id: '2',
        party_type: 'customer',
        status: 'active',
        deleted_at: null,
      },
      select: { id: true, name: true },
    });
    expect(prisma.customerComplaint.count).toHaveBeenCalledWith({ where: { company_id: '2' } });
    expect(prisma.customerComplaint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: '2',
          complaint_no: expect.stringMatching(/-0006$/),
          customer_id: 'cust-1',
          customer_name: '客户A',
          production_batch_id: 'batch-1',
        }),
      }),
    );
  });

  it('blocks resolve when complaint is outside current company', async () => {
    prisma.customerComplaint.findFirst.mockResolvedValue(null);

    await expect(service.resolve('cc1', '已处理', '2')).rejects.toThrow(NotFoundException);
    expect(prisma.customerComplaint.update).not.toHaveBeenCalled();
  });
});
