import { Module } from '@nestjs/common';
import { WorkflowTriggersService } from './workflow-triggers.service';

@Module({
  providers: [WorkflowTriggersService],
})
export class WorkflowTriggersModule {}
