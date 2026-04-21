import { Module } from '@nestjs/common';
import { ViolationRecordController } from './violation-record.controller';
import { ViolationRecordService } from './violation-record.service';

@Module({
  controllers: [ViolationRecordController],
  providers: [ViolationRecordService],
  exports: [ViolationRecordService],
})
export class ViolationRecordModule {}
