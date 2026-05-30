import { Module } from '@nestjs/common';
import { CleaningRecordController } from './cleaning-record.controller';
import { CleaningRecordService } from './cleaning-record.service';
import { SanitizerConcentrationController } from './sanitizer-concentration.controller';
import { SanitizerConcentrationService } from './sanitizer-concentration.service';
import { CleaningPlanController } from './cleaning-plan.controller';
import { CleaningPlanService } from './cleaning-plan.service';
import { NonConformanceModule } from '../non-conformance/non-conformance.module';

@Module({
  imports: [NonConformanceModule],
  controllers: [CleaningRecordController, SanitizerConcentrationController, CleaningPlanController],
  providers: [CleaningRecordService, SanitizerConcentrationService, CleaningPlanService],
  exports: [CleaningRecordService, SanitizerConcentrationService, CleaningPlanService],
})
export class CleaningRecordModule {}
