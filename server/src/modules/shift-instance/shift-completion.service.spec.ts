import { Test } from '@nestjs/testing';
import { ShiftCompletionService } from './shift-completion.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ShiftCompletionService', () => {
  let service: ShiftCompletionService;

  const mockPrisma = {
    productionRun: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ShiftCompletionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ShiftCompletionService);
  });

  it('should return 100% completion rate (no dynamic templates)', async () => {
    mockPrisma.productionRun.findMany.mockResolvedValue([{
      id: 'r1',
      product: { name: 'ProductX' },
      production_line: '1',
      status: 'active',
    }]);

    const result = await service.getCompletionStatus('shift1');
    expect(result[0].completion_rate).toBe('100.0');
    expect(result[0].missing_templates).toHaveLength(0);
    expect(result[0].total_mandatory).toBe(0);
    expect(result[0].filled).toBe(0);
  });

  it('should return empty array when no runs', async () => {
    mockPrisma.productionRun.findMany.mockResolvedValue([]);

    const result = await service.getCompletionStatus('shift1');
    expect(result).toEqual([]);
  });
});
