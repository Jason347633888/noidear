import { Module } from '@nestjs/common';
import { FoodSafetyCultureRecordController } from './food-safety-culture-record.controller';
import { FoodSafetyCultureRecordService } from './food-safety-culture-record.service';

@Module({
  controllers: [FoodSafetyCultureRecordController],
  providers: [FoodSafetyCultureRecordService],
  exports: [FoodSafetyCultureRecordService],
})
export class FoodSafetyCultureRecordModule {}
