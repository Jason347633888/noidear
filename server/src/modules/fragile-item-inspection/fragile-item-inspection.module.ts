import { Module } from '@nestjs/common';
import { FragileItemInspectionController } from './fragile-item-inspection.controller';
import { FragileItemInspectionService } from './fragile-item-inspection.service';
import { FragileItemLedgerService } from './fragile-item-ledger.service';
import { FragileItemLedgerController } from './fragile-item-ledger.controller';
import { QualityNumberSequenceModule } from '../quality-number-sequence/quality-number-sequence.module';

@Module({
  imports: [QualityNumberSequenceModule],
  controllers: [FragileItemInspectionController, FragileItemLedgerController],
  providers: [FragileItemInspectionService, FragileItemLedgerService],
  exports: [FragileItemInspectionService, FragileItemLedgerService],
})
export class FragileItemInspectionModule {}
