import { Test, TestingModule } from '@nestjs/testing';
import { TemplateService } from './template.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ExcelParserService } from '../../common/services';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('TemplateService - Tolerance Configuration', () => {
  let service: TemplateService;

  const mockPrisma: any = {
    template: { findUnique: jest.fn(), update: jest.fn() },
  };

  const mockExcelParser: any = {
    parseToTemplateFields: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ExcelParserService, useValue: mockExcelParser },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should add tolerance config', async () => {
    mockPrisma.template.findUnique.mockResolvedValue({
      id: 'tpl-1',
      version: 1.0,
      creatorId: 'admin-1',
      fieldsJson: [
        { name: 'temp', type: 'number' },
      ],
    });
    mockPrisma.template.update.mockResolvedValue({
      id: 'tpl-1',
      version: 1.1,
      fieldsJson: [
        {
          name: 'temp',
          type: 'number',
          tolerance: { type: 'range', min: 175, max: 185 },
        },
      ],
    });

    const result = await service.updateToleranceConfig('tpl-1', {
      temp: { type: 'range', min: 175, max: 185 },
    }, 'admin-1', 'admin');

    expect(result.version).toBe(1.1);
  });

  it('should reject negative tolerance values', async () => {
    mockPrisma.template.findUnique.mockResolvedValue({
      id: 'tpl-1',
      creatorId: 'admin-1',
      fieldsJson: [{ name: 'temp', type: 'number' }],
    });

    await expect(
      service.updateToleranceConfig('tpl-1', {
        temp: { type: 'range', min: -10, max: 10 },
      }, 'admin-1', 'admin'),
    ).rejects.toThrow(BusinessException);
  });

  it('should reject percentage > 100%', async () => {
    mockPrisma.template.findUnique.mockResolvedValue({
      id: 'tpl-1',
      creatorId: 'admin-1',
      fieldsJson: [{ name: 'temp', type: 'number' }],
    });

    await expect(
      service.updateToleranceConfig('tpl-1', {
        temp: { type: 'percentage', min: 0, max: 100, percentage: 150 },
      }, 'admin-1', 'admin'),
    ).rejects.toThrow(BusinessException);
  });
});
