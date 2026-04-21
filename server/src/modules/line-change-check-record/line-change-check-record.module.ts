import { Module } from '@nestjs/common';
import { LineChangeCheckRecordController } from './line-change-check-record.controller';
import { LineChangeCheckRecordService } from './line-change-check-record.service';

@Module({
  controllers: [LineChangeCheckRecordController],
  providers: [LineChangeCheckRecordService],
  exports: [LineChangeCheckRecordService],
})
export class LineChangeCheckRecordModule {}
