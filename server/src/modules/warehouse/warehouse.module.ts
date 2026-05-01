import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BatchTraceModule } from '../batch-trace/batch-trace.module';
import { NotificationModule } from '../notification/notification.module';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { DocumentModule } from '../document/document.module';
import { UserPermissionModule } from '../user-permission/user-permission.module';
import { StorageService } from '../../common/services';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';
import { InboundController } from './inbound.controller';
import { InboundService } from './inbound.service';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { RequisitionController } from './requisition.controller';
import { RequisitionService } from './requisition.service';
import { StagingAreaController } from './staging-area.controller';
import { StagingAreaService } from './staging-area.service';
import { MaterialBalanceController } from './material-balance.controller';
import { MaterialBalanceService } from './material-balance.service';
import { ReturnController } from './controllers/return.controller';
import { ReturnService } from './services/return.service';
import { ScrapController } from './controllers/scrap.controller';
import { ScrapService } from './services/scrap.service';
import { WarehouseTraceabilityController } from './traceability.controller';
import { WarehouseCronService } from './warehouse-cron.service';
import { InventoryMovementLedgerService } from './services/inventory-movement-ledger.service';
import { SupplierAccessService } from './services/supplier-access.service';

@Module({
  imports: [PrismaModule, BatchTraceModule, NotificationModule, UnifiedApprovalModule, DocumentModule, UserPermissionModule],
  controllers: [MaterialController, SupplierController, InboundController, BatchController, RequisitionController, StagingAreaController, MaterialBalanceController, ReturnController, ScrapController, WarehouseTraceabilityController],
  providers: [MaterialService, SupplierService, InboundService, BatchService, RequisitionService, StagingAreaService, MaterialBalanceService, ReturnService, ScrapService, WarehouseCronService, StorageService, PermissionGuard, InventoryMovementLedgerService, SupplierAccessService],
  exports: [MaterialService, SupplierService, InboundService, BatchService, RequisitionService, StagingAreaService, MaterialBalanceService, ReturnService, ScrapService, InventoryMovementLedgerService, SupplierAccessService],
})
export class WarehouseModule implements OnModuleInit {
  constructor(private readonly callbacks: ApprovalCallbackRegistry) {}

  onModuleInit() {
    const makeCallback = (modelName: string) => async (context: any) => {
      await (context.tx as any)[modelName].update({
        where: { id: context.resourceId },
        data: { status: 'approved', approvedBy: context.actorId, approvedAt: new Date() },
      });
    };

    this.callbacks.register('warehouse.requisitionApproved', makeCallback('materialRequisition'));
    this.callbacks.register('warehouse.inboundApproved', makeCallback('materialInbound'));
    this.callbacks.register('warehouse.returnApproved', makeCallback('materialReturn'));
    this.callbacks.register('warehouse.scrapApproved', makeCallback('materialScrap'));
  }
}
