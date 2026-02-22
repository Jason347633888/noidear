import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WechatService } from './wechat.service';
import {
  SubscribeMessageDto,
  SubscribeMessageResponseDto,
  MessageTemplateDto,
} from './dto';

@ApiTags('微信消息')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wechat')
export class WechatController {
  constructor(private readonly wechatService: WechatService) {}

  @Post('subscribe')
  @ApiOperation({ summary: '发送订阅消息推送' })
  async sendSubscribeMessage(
    @Body() dto: SubscribeMessageDto,
  ): Promise<SubscribeMessageResponseDto> {
    return this.wechatService.sendSubscribeMessage(dto);
  }

  @Get('templates')
  @ApiOperation({ summary: '查询消息模板列表' })
  getTemplates(): MessageTemplateDto[] {
    return this.wechatService.getTemplates();
  }
}
