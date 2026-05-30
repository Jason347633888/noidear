import { Module } from '@nestjs/common';
import { CleaningRecordController } from './cleaning-record.controller';
import { CleaningRecordService } from './cleaning-record.service';
import { SanitizerConcentrationController } from './sanitizer-concentration.controller';
import { SanitizerConcentrationService } from './sanitizer-concentration.service';
import { NonConformanceModule } from '../non-conformance/non-conformance.module';

@Module({
  imports: [NonConformanceModule],
  controllers: [CleaningRecordController, SanitizerConcentrationController],
  providers: [CleaningRecordService, SanitizerConcentrationService],
  exports: [CleaningRecordService, SanitizerConcentrationService],
})
export class CleaningRecordModule {}
