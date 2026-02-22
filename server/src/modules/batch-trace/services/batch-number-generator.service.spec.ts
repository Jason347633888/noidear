import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { BatchNumberGeneratorService } from './batch-number-generator.service';
import * as dayjs from 'dayjs';

describe('BatchNumberGeneratorService', () => {
  let service: BatchNumberGeneratorService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchNumberGeneratorService,
        {
          provide: PrismaService,
          useValue: {
            systemConfig: {
              findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BatchNumberGeneratorService>(BatchNumberGeneratorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateBatchNumber', () => {
    it('should generate batch number with default format', async () => {
      // Arrange
      const mockConfig = {
        key: 'batch.number.format',
        value: 'BATCH-{YYYYMMDD}-{序号}',
      };
      const today = dayjs().format('YYYYMMDD');

      jest.spyOn(prisma.systemConfig, 'findUnique').mockResolvedValue(mockConfig as any);
      jest.spyOn(prisma, '$transaction').mockResolvedValue(1);

      // Act
      const result = await service.generateBatchNumber('material');

      // Assert
      expect(result).toBe(`BATCH-${today}-001`);
      expect(prisma.systemConfig.findUnique).toHaveBeenCalledWith({
        where: { key: 'batch.number.format' },
      });
    });

    it('should increment sequence number for same day', async () => {
      // Arrange
      const mockConfig = {
        key: 'batch.number.format',
        value: 'BATCH-{YYYYMMDD}-{序号}',
      };
      const today = dayjs().format('YYYYMMDD');

      jest.spyOn(prisma.systemConfig, 'findUnique').mockResolvedValue(mockConfig as any);
      jest.spyOn(prisma, '$transaction')
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3);

      // Act
      const result1 = await service.generateBatchNumber('material');
      const result2 = await service.generateBatchNumber('material');
      const result3 = await service.generateBatchNumber('material');

      // Assert
      expect(result1).toBe(`BATCH-${today}-001`);
      expect(result2).toBe(`BATCH-${today}-002`);
      expect(result3).toBe(`BATCH-${today}-003`);
    });

    it('should support different batch types', async () => {
      // Arrange
      const mockConfig = {
        key: 'batch.number.format',
        value: 'BATCH-{YYYYMMDD}-{序号}',
      };
      const today = dayjs().format('YYYYMMDD');

      jest.spyOn(prisma.systemConfig, 'findUnique').mockResolvedValue(mockConfig as any);
      jest.spyOn(prisma, '$transaction')
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      // Act
      const material = await service.generateBatchNumber('material');
      const production = await service.generateBatchNumber('production');
      const finished = await service.generateBatchNumber('finished');

      // Assert
      expect(material).toBe(`BATCH-${today}-001`);
      expect(production).toBe(`BATCH-${today}-001`);
      expect(finished).toBe(`BATCH-${today}-001`);
    });

    it('should throw error if config not found', async () => {
      // Arrange
      jest.spyOn(prisma.systemConfig, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(service.generateBatchNumber('material')).rejects.toThrow(
        'Batch number format config not found',
      );
    });

    it('should ensure batch number uniqueness with transaction', async () => {
      // Arrange
      const mockConfig = {
        key: 'batch.number.format',
        value: 'BATCH-{YYYYMMDD}-{序号}',
      };

      jest.spyOn(prisma.systemConfig, 'findUnique').mockResolvedValue(mockConfig as any);

      // Mock transaction to simulate concurrent calls
      let sequenceCounter = 0;
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        sequenceCounter++;
        return sequenceCounter;
      });

      // Act - Simulate concurrent calls
      const promises = Array.from({ length: 10 }, () =>
        service.generateBatchNumber('material')
      );
      const results = await Promise.all(promises);

      // Assert - All batch numbers should be unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(10);
    });
  });

  describe('validateBatchNumber', () => {
    it('should validate correct batch number format', () => {
      // Arrange
      const validBatchNumber = 'BATCH-20260215-001';

      // Act
      const result = service.validateBatchNumber(validBatchNumber);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject invalid batch number format', () => {
      // Arrange
      const invalidBatchNumbers = [
        'INVALID',
        'BATCH-001',
        'BATCH-20260215',
        '20260215-001',
      ];

      // Act & Assert
      invalidBatchNumbers.forEach((batchNumber) => {
        expect(service.validateBatchNumber(batchNumber)).toBe(false);
      });
    });
  });

  describe('parseBatchNumber', () => {
    it('should parse batch number into components', () => {
      // Arrange
      const batchNumber = 'BATCH-20260215-001';

      // Act
      const result = service.parseBatchNumber(batchNumber);

      // Assert
      expect(result).toEqual({
        prefix: 'BATCH',
        date: '20260215',
        sequence: '001',
      });
    });

    it('should throw error for invalid batch number', () => {
      // Arrange
      const invalidBatchNumber = 'INVALID';

      // Act & Assert
      expect(() => service.parseBatchNumber(invalidBatchNumber)).toThrow(
        'Invalid batch number format',
      );
    });
  });
});
