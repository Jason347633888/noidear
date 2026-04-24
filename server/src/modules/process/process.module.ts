import { Module } from '@nestjs/common';
import { ProcessInstanceController } from './process-instance.controller';
import { ProcessTemplateController } from './process-template.controller';

@Module({
  controllers: [ProcessInstanceController, ProcessTemplateController],
})
export class ProcessModule {}
