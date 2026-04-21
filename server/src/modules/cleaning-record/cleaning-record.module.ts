import { Module } from '@nestjs/common';
import { CleaningRecordController } from './cleaning-record.controller';
import { CleaningRecordService } from './cleaning-record.service';

@Module({
  controllers: [CleaningRecordController],
  providers: [CleaningRecordService],
  exports: [CleaningRecordService],
})
export class CleaningRecordModule {}
