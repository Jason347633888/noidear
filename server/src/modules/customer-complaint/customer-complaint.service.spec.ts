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
        },
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
        },
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

  it('scopes complaint numbering and writes by company', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({ id: 'batch-1', productId: 'prod-1' });
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
    prisma.customerComplaint.count.mockResolvedValue(5);
    prisma.customerComplaint.create.mockResolvedValue({ id: 'cc1' });

    await service.create(
      {
        customer_name: '客户',
        production_batch_id: 'batch-1',
        description: '投诉',
      },
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
    expect(prisma.customerComplaint.count).toHaveBeenCalledWith({ where: { company_id: '2' } });
    expect(prisma.customerComplaint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: '2',
          complaint_no: expect.stringMatching(/-0006$/),
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
