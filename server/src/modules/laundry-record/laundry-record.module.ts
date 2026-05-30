import { Module } from '@nestjs/common';
import { LaundryRecordController } from './laundry-record.controller';
import { LaundryRecordService } from './laundry-record.service';

@Module({
  controllers: [LaundryRecordController],
  providers: [LaundryRecordService],
  exports: [LaundryRecordService],
})
export class LaundryRecordModule {}
