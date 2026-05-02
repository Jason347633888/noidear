import { Module } from '@nestjs/common';
import { QualityNumberSequenceModule } from '../quality-number-sequence/quality-number-sequence.module';
import { WorkflowTriggersService } from './workflow-triggers.service';

@Module({
  imports: [QualityNumberSequenceModule],
  providers: [WorkflowTriggersService],
})
export class WorkflowTriggersModule {}
