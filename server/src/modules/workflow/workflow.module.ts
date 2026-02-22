import { Module } from '@nestjs/common';
import { WorkflowTemplateController } from './workflow-template.controller';
import { WorkflowTemplateService } from './workflow-template.service';
import { WorkflowInstanceController } from './workflow-instance.controller';
import { WorkflowInstanceService } from './workflow-instance.service';
import { WorkflowTaskController } from './workflow-task.controller';
import { WorkflowTaskService } from './workflow-task.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [
    WorkflowTemplateController,
    WorkflowInstanceController,
    WorkflowTaskController,
  ],
  providers: [
    WorkflowTemplateService,
    WorkflowInstanceService,
    WorkflowTaskService,
  ],
  exports: [
    WorkflowTemplateService,
    WorkflowInstanceService,
    WorkflowTaskService,
  ],
})
export class WorkflowModule {}
