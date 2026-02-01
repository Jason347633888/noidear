import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
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
  async findAll(@Query() query: NotificationQueryDto, @Body() body: Record<string, unknown>) {
    const user = JSON.parse(body.user as string || '{}');
    return this.notificationService.findAll(query, user.id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记已读' })
  async markAsRead(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const user = JSON.parse(body.user as string || '{}');
    return this.notificationService.markAsRead(id, user.id);
  }

  @Post('read-all')
  @ApiOperation({ summary: '全部标记已读' })
  async markAllAsRead(@Body() body: Record<string, unknown>) {
    const user = JSON.parse(body.user as string || '{}');
    return this.notificationService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  async delete(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const user = JSON.parse(body.user as string || '{}');
    return this.notificationService.delete(id, user.id);
  }
}
