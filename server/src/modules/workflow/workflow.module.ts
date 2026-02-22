import { Module } from '@nestjs/common';
import { WorkflowTemplateController } from './workflow-template.controller';
import { WorkflowTemplateService } from './workflow-template.service';
import { WorkflowInstanceController } from './workflow-instance.controller';
import { WorkflowInstanceService } from './workflow-instance.service';
import { WorkflowTaskController } from './workflow-task.controller';
import { WorkflowTaskService } from './workflow-task.service';
import { WorkflowAdvancedController } from './workflow-advanced.controller';
import { WorkflowAdvancedService } from './workflow-advanced.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [
    WorkflowTemplateController,
    WorkflowInstanceController,
    WorkflowTaskController,
    WorkflowAdvancedController,
  ],
  providers: [
    WorkflowTemplateService,
    WorkflowInstanceService,
    WorkflowTaskService,
    WorkflowAdvancedService,
  ],
  exports: [
    WorkflowTemplateService,
    WorkflowInstanceService,
    WorkflowTaskService,
    WorkflowAdvancedService,
  ],
})
export class WorkflowModule {}
