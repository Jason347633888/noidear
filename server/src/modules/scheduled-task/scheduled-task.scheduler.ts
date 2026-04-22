import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScheduledTaskService } from './scheduled-task.service';

@Injectable()
export class ScheduledTaskScheduler {
  constructor(private readonly svc: ScheduledTaskService) {}

  @Cron('0 8 * * *')
  async dailyTrigger() {
    await this.svc.triggerDueTasks();
  }
}
