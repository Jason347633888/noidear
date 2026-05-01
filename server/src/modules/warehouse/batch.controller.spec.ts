import { GoneException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';

describe('BatchController', () => {
  let controller: BatchController;
  let service: BatchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BatchController],
      providers: [
        {
          provide: BatchService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            getFIFO: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            lock: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(BatchController);
    service = module.get(BatchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the BatchService GoneException for direct manual create', async () => {
    const dto = {
      batchNumber: 'BATCH-20260215-001',
      materialId: 'material-001',
      productionDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-07-01'),
      quantity: 100,
    };

    jest
      .spyOn(service, 'create')
      .mockRejectedValue(
        new GoneException(
          'Direct material batch creation is disabled. Complete a MaterialInbound to create MaterialBatch.',
        ),
      );

    await expect(controller.create(dto)).rejects.toThrow(GoneException);
    expect(service.create).toHaveBeenCalledWith(dto);
  });
});
