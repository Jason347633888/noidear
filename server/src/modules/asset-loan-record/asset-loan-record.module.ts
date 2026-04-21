import { Module } from '@nestjs/common';
import { AssetLoanRecordController } from './asset-loan-record.controller';
import { AssetLoanRecordService } from './asset-loan-record.service';

@Module({
  controllers: [AssetLoanRecordController],
  providers: [AssetLoanRecordService],
  exports: [AssetLoanRecordService],
})
export class AssetLoanRecordModule {}
