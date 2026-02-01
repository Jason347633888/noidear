import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Snowflake } from '../../common/utils/snowflake';
import { CreateNotificationDto, NotificationQueryDto } from './dto';

@Injectable()
export class NotificationService {
  private readonly snowflake: Snowflake;

  constructor(private readonly prisma: PrismaService) {
    this.snowflake = new Snowflake(1, 1);
  }

  /**
   * 创建通知
   */
  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        id: this.snowflake.nextId(),
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
      },
    });
  }

  /**
   * 批量创建通知
   */
  async createMany(dtos: CreateNotificationDto[]) {
    const data = dtos.map((dto) => ({
      id: this.snowflake.nextId(),
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      content: dto.content,
    }));

    return this.prisma.notification.createMany({ data });
  }

  /**
   * 查询通知列表
   */
  async findAll(query: NotificationQueryDto, userId: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { unreadOnly } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [list, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { list, total, unreadCount, page, limit };
  }

  /**
   * 标记已读
   */
  async markAsRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  /**
   * 全部标记已读
   */
  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  /**
   * 删除通知
   */
  async delete(id: string, userId: string) {
    await this.prisma.notification.deleteMany({
      where: { id, userId },
    });
    return { success: true };
  }
}
