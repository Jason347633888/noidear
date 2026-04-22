import { Test } from '@nestjs/testing';
import { ManagementDashboardService } from './management-dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ManagementDashboardService', () => {
  let service: ManagementDashboardService;

  const mockPrisma = {
    nonConformance: { count: jest.fn() },
    correctiveAction: { count: jest.fn(), findMany: jest.fn() },
    record: { count: jest.fn() },
    document: { count: jest.fn(), findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.values(mockPrisma).forEach((m: any) => {
      if (typeof m.count === 'function') m.count.mockResolvedValue(0);
      if (typeof m.findMany === 'function') m.findMany.mockResolvedValue([]);
    });
    const module = await Test.createTestingModule({
      providers: [
        ManagementDashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ManagementDashboardService);
  });

  it('should return KPIs with numeric values', async () => {
    mockPrisma.nonConformance.count.mockResolvedValue(5);
    mockPrisma.correctiveAction.count.mockResolvedValue(2);

    const kpis = await service.getKpis();

    expect(kpis.nc_count_this_month).toBe(5);
    expect(kpis.capa_overdue_count).toBe(2);
    expect(typeof kpis.docs_expiring_soon).toBe('number');
  });

  it('should list documents expiring within 30 days', async () => {
    mockPrisma.document.findMany.mockResolvedValue([
      { id: 'd1', title: 'SOP-01', review_due_date: new Date() },
    ]);

    const docs = await service.getBrcgsReadiness();
    expect(docs.expiring_docs).toHaveLength(1);
  });
});
