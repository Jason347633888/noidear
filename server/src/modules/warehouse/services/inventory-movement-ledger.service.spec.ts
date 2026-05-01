import { InventoryMovementLedgerService } from './inventory-movement-ledger.service';

describe('InventoryMovementLedgerService', () => {
  const prisma = {
    inventoryMovement: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes a material batch receive movement using root prisma when no tx', async () => {
    const service = new InventoryMovementLedgerService(prisma as any);

    await service.recordMaterialBatchMovement({
      companyId: 1,
      movementType: 'receive',
      batchId: 'batch-1',
      quantity: 12.5,
      unit: 'kg',
      refType: 'inbound',
      refId: 'inbound-1',
      operatorId: 'user-1',
      movedAt: new Date('2026-05-01T08:00:00.000Z'),
      notes: '入库',
    });

    expect(prisma.inventoryMovement.create).toHaveBeenCalledWith({
      data: {
        company_id: 1,
        movement_type: 'receive',
        object_type: 'material_batch',
        object_id: 'batch-1',
        qty: 12.5,
        unit: 'kg',
        ref_type: 'inbound',
        ref_id: 'inbound-1',
        operator_id: 'user-1',
        moved_at: new Date('2026-05-01T08:00:00.000Z'),
        notes: '入库',
      },
    });
  });

  it('uses the provided tx client instead of root prisma', async () => {
    const service = new InventoryMovementLedgerService(prisma as any);

    const txClient = {
      inventoryMovement: {
        create: jest.fn(),
      },
    };

    await service.recordMaterialBatchMovement(
      {
        companyId: 1,
        movementType: 'receive',
        batchId: 'batch-tx',
        quantity: 5,
        unit: 'kg',
        refType: 'inbound',
        refId: 'inbound-tx',
        operatorId: 'user-tx',
        movedAt: new Date('2026-05-01T08:00:00.000Z'),
        notes: 'tx 入库',
      },
      txClient as any,
    );

    expect(txClient.inventoryMovement.create).toHaveBeenCalledWith({
      data: {
        company_id: 1,
        movement_type: 'receive',
        object_type: 'material_batch',
        object_id: 'batch-tx',
        qty: 5,
        unit: 'kg',
        ref_type: 'inbound',
        ref_id: 'inbound-tx',
        operator_id: 'user-tx',
        moved_at: new Date('2026-05-01T08:00:00.000Z'),
        notes: 'tx 入库',
      },
    });
    expect(prisma.inventoryMovement.create).not.toHaveBeenCalled();
  });
});
