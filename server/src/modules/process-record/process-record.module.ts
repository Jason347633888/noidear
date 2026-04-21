import { Module } from '@nestjs/common';
import { ProcessRecordController } from './process-record.controller';
import { ProcessRecordService } from './process-record.service';

@Module({
  controllers: [ProcessRecordController],
  providers: [ProcessRecordService],
  exports: [ProcessRecordService],
})
export class ProcessRecordModule {}
