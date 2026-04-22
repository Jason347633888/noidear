import { Test } from '@nestjs/testing';
import { ShiftCompletionService } from './shift-completion.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ShiftCompletionService', () => {
  let service: ShiftCompletionService;

  const mockPrisma = {
    productionRun: { findMany: jest.fn() },
    recordTemplate: { findMany: jest.fn() },
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

  it('should return 100% when all mandatory templates are filled', async () => {
    mockPrisma.recordTemplate.findMany.mockResolvedValue([
      { code: 'TPL-A', name: 'Template A' },
    ]);
    mockPrisma.productionRun.findMany.mockResolvedValue([{
      id: 'r1',
      product: { name: 'ProductX' },
      production_line: '1',
      status: 'active',
      records: [{ template: { code: 'TPL-A' } }],
    }]);

    const result = await service.getCompletionStatus('shift1');
    expect(result[0].completion_rate).toBe('100.0');
    expect(result[0].missing_templates).toHaveLength(0);
  });

  it('should list missing templates when unfilled', async () => {
    mockPrisma.recordTemplate.findMany.mockResolvedValue([
      { code: 'TPL-A', name: 'A' },
      { code: 'TPL-B', name: 'B' },
    ]);
    mockPrisma.productionRun.findMany.mockResolvedValue([{
      id: 'r1',
      product: { name: 'X' },
      production_line: '1',
      status: 'active',
      records: [{ template: { code: 'TPL-A' } }],
    }]);

    const result = await service.getCompletionStatus('shift1');
    expect(result[0].completion_rate).toBe('50.0');
    expect(result[0].missing_templates[0].code).toBe('TPL-B');
  });
});
