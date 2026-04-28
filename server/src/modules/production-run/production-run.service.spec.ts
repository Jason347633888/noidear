import { Test } from '@nestjs/testing';
import { ProductionRunService } from './production-run.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ProductionRunService', () => {
  let service: ProductionRunService;
  const mockEmit = jest.fn();

  const mockPrisma = {
    shiftInstance: { findFirst: jest.fn() },
    product: { findFirst: jest.fn() },
    recipe: { findFirst: jest.fn() },
    productionRun: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ProductionRunService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: { emit: mockEmit } },
      ],
    }).compile();
    service = module.get(ProductionRunService);
  });

  describe('create', () => {
    it('should throw NotFoundException when shift not found', async () => {
      mockPrisma.shiftInstance.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ shift_instance_id: 'x', production_line: '1', product_id: 'p1', recipe_id: 'r1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when shift is closed', async () => {
      mockPrisma.shiftInstance.findFirst.mockResolvedValue({ id: 's1', status: 'closed' });
      await expect(
        service.create({ shift_instance_id: 's1', production_line: '1', product_id: 'p1', recipe_id: 'r1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create run for open shift', async () => {
      mockPrisma.shiftInstance.findFirst.mockResolvedValue({ id: 's1', status: 'open', company_id: '1' });
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', status: 'active' });
      mockPrisma.recipe.findFirst.mockResolvedValue({ id: 'r1', product_id: 'p1', status: 'active' });
      mockPrisma.productionRun.create.mockResolvedValue({ id: 'r1', status: 'active' });
      const result = await service.create({
        shift_instance_id: 's1', production_line: '1', product_id: 'p1', recipe_id: 'r1',
      });
      expect(result.status).toBe('active');
    });

    it('开工时要求 active 产品和匹配的 active 配方', async () => {
      mockPrisma.shiftInstance.findFirst.mockResolvedValue({ id: 's1', status: 'open', company_id: '1' });
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', status: 'active' });
      mockPrisma.recipe.findFirst.mockResolvedValue({ id: 'r1', product_id: 'p1', status: 'active' });
      mockPrisma.productionRun.create.mockResolvedValue({ id: 'run-1' });

      await service.create({
        shift_instance_id: 's1',
        production_line: '1号线',
        product_id: 'p1',
        recipe_id: 'r1',
      });

      expect(mockPrisma.recipe.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', product_id: 'p1', company_id: '1', status: 'active' },
      });
    });

    it('没有 active 配方时拒绝开工', async () => {
      mockPrisma.shiftInstance.findFirst.mockResolvedValue({ id: 's1', status: 'open', company_id: '1' });
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', status: 'active' });
      mockPrisma.recipe.findFirst.mockResolvedValue(null);

      await expect(service.create({
        shift_instance_id: 's1',
        production_line: '1号线',
        product_id: 'p1',
        recipe_id: 'r1',
      })).rejects.toThrow('配方不存在、未激活或不属于该产品');
    });
  });

  describe('close', () => {
    it('should emit production-run.closed event on close', async () => {
      mockPrisma.productionRun.findFirst.mockResolvedValue({
        id: 'r1', status: 'active', product_id: 'p1', shift_instance_id: 's1', company_id: '1',
      });
      mockPrisma.productionRun.update.mockResolvedValue({ id: 'r1', status: 'closed', product_id: 'p1', shift_instance_id: 's1', company_id: '1' });
      await service.close('r1', {});
      expect(mockEmit).toHaveBeenCalledWith('production-run.closed', expect.objectContaining({ id: 'r1' }));
    });
  });
});
