import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type InventoryMovementType =
  | 'receive'
  | 'issue_to_production'
  | 'return_to_warehouse'
  | 'scrap'
  | 'transfer'
  | 'adjustment';

interface RecordMaterialBatchMovementInput {
  companyId?: number;
  movementType: InventoryMovementType;
  batchId: string;
  quantity: number;
  unit?: string;
  refType?: string;
  refId?: string;
  operatorId?: string;
  movedAt?: Date;
  fromLocation?: string;
  toLocation?: string;
  notes?: string;
}

@Injectable()
export class InventoryMovementLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async recordMaterialBatchMovement(
    input: RecordMaterialBatchMovementInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.inventoryMovement.create({
      data: {
        company_id: input.companyId ?? 1,
        movement_type: input.movementType,
        object_type: 'material_batch',
        object_id: input.batchId,
        from_location: input.fromLocation,
        to_location: input.toLocation,
        qty: input.quantity,
        unit: input.unit ?? 'kg',
        ref_type: input.refType,
        ref_id: input.refId,
        operator_id: input.operatorId,
        moved_at: input.movedAt ?? new Date(),
        notes: input.notes,
      },
    });
  }
}
