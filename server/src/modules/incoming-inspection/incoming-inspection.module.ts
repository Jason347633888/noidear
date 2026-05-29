import { Module } from '@nestjs/common';
import { StorageService } from '../../common/services';
import { PrismaModule } from '../../prisma/prisma.module';
import { DocumentModule } from '../document/document.module';
import { BatchTraceModule } from '../batch-trace/batch-trace.module';
import { InventoryMovementLedgerService } from '../warehouse/services/inventory-movement-ledger.service';
import { IncomingInspectionController } from './incoming-inspection.controller';
import { IncomingInspectionService } from './incoming-inspection.service';

@Module({
  imports: [PrismaModule, DocumentModule, BatchTraceModule],
  controllers: [IncomingInspectionController],
  providers: [IncomingInspectionService, StorageService, InventoryMovementLedgerService],
  exports: [IncomingInspectionService],
})
export class IncomingInspectionModule {}
