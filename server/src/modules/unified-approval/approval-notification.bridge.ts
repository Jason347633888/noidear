import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ApprovalNotificationBridge {
  constructor(private readonly notificationService: NotificationService) {}

  async notifyTaskCreated(userIds: string[], title: string, taskId: string) {
    if (userIds.length === 0) return;

    await this.notificationService.createMany(
      [...new Set(userIds)].map((userId) => ({
        userId,
        type: 'approval_task',
        title: '您有新的审批待办',
        content: `${title} 等待审批，任务 ${taskId}`,
      })),
    );
  }

  async notifyRequester(userId: string, type: 'approved' | 'rejected', title: string) {
    await this.notificationService.create({
      userId,
      type: type === 'approved' ? 'approval_approved' : 'approval_rejected',
      title: type === 'approved' ? '审批已通过' : '审批已驳回',
      content: title,
    });
  }
}
