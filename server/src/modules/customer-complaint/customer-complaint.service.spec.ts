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
  };
  let service: CustomerComplaintService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CustomerComplaintService(prisma as any);
  });

  it('scopes complaint numbering and writes by company', async () => {
    prisma.customerComplaint.count.mockResolvedValue(5);
    prisma.customerComplaint.create.mockResolvedValue({ id: 'cc1' });

    await service.create({ customer_name: '客户', description: '投诉' }, '2');

    expect(prisma.customerComplaint.count).toHaveBeenCalledWith({ where: { company_id: '2' } });
    expect(prisma.customerComplaint.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ company_id: '2', complaint_no: expect.stringMatching(/-0006$/) }) }),
    );
  });

  it('blocks resolve when complaint is outside current company', async () => {
    prisma.customerComplaint.findFirst.mockResolvedValue(null);

    await expect(service.resolve('cc1', '已处理', '2')).rejects.toThrow(NotFoundException);
    expect(prisma.customerComplaint.update).not.toHaveBeenCalled();
  });
});
