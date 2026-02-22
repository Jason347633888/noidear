import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BatchTraceModule } from '../batch-trace/batch-trace.module';
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

@Module({
  imports: [PrismaModule, BatchTraceModule],
  controllers: [MaterialController, SupplierController, InboundController, BatchController, RequisitionController, StagingAreaController, MaterialBalanceController, ReturnController, ScrapController, WarehouseTraceabilityController],
  providers: [MaterialService, SupplierService, InboundService, BatchService, RequisitionService, StagingAreaService, MaterialBalanceService, ReturnService, ScrapService],
  exports: [MaterialService, SupplierService, InboundService, BatchService, RequisitionService, StagingAreaService, MaterialBalanceService, ReturnService, ScrapService],
})
export class WarehouseModule {}
