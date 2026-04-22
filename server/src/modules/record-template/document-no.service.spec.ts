import { Test } from '@nestjs/testing';
import { DocumentNoService } from './document-no.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DocumentNoService', () => {
  let service: DocumentNoService;
  const mockPrisma = {
    record: { count: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DocumentNoService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(DocumentNoService);
  });

  it('should generate document number with 4-digit sequence', async () => {
    mockPrisma.record.count.mockResolvedValue(2); // 2 existing today
    const no = await service.generate('GRSS-ZZ-JL-01');
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    expect(no).toBe(`GRSS-ZZ-JL-01-${today}-0003`);
  });

  it('should start at 0001 when no records exist today', async () => {
    mockPrisma.record.count.mockResolvedValue(0);
    const no = await service.generate('TPL-001');
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    expect(no).toBe(`TPL-001-${today}-0001`);
  });
});
