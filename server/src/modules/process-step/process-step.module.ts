import { Module } from '@nestjs/common';
import { ProcessStepController } from './process-step.controller';
import { ProcessStepService } from './process-step.service';

@Module({
  controllers: [ProcessStepController],
  providers: [ProcessStepService],
  exports: [ProcessStepService],
})
export class ProcessStepModule {}
