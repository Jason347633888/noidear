import { Module } from '@nestjs/common';
import { ReworkRecordController } from './rework-record.controller';
import { ReworkRecordService } from './rework-record.service';

@Module({
  controllers: [ReworkRecordController],
  providers: [ReworkRecordService],
  exports: [ReworkRecordService],
})
export class ReworkRecordModule {}
