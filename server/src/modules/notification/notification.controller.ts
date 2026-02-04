import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CreateNotificationDto, NotificationQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('消息通知')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '查询通知列表' })
  async findAll(@Query() query: NotificationQueryDto, @Req() req: any) {
    return this.notificationService.findAll(query, req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '查询未读通知数量' })
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationService.getUnreadCount(req.user.id);
    return { count };
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记已读' })
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.notificationService.markAsRead(id, req.user.id);
  }

  @Post('read-all')
  @ApiOperation({ summary: '全部标记已读' })
  async markAllAsRead(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.notificationService.delete(id, req.user.id);
  }
}
