import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsString } from 'class-validator';

export enum WechatMessageType {
  TODO_REMIND = 'todo_remind',
  EXPIRY_WARNING = 'expiry_warning',
  APPROVAL_NOTICE = 'approval_notice',
}

export class SubscribeMessageDto {
  @ApiProperty({
    description: '推送类型',
    enum: WechatMessageType,
    example: WechatMessageType.TODO_REMIND,
  })
  @IsEnum(WechatMessageType)
  @IsNotEmpty()
  type: WechatMessageType;

  @ApiProperty({ description: '微信消息模板 ID' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: '消息数据（模板变量）' })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, { value: string }>;

  @ApiProperty({ description: '接收者 openid' })
  @IsString()
  @IsNotEmpty()
  touser: string;
}

export class SubscribeMessageResponseDto {
  @ApiProperty({ description: '消息记录 ID' })
  id: string;

  @ApiProperty({ description: '推送状态' })
  status: string;

  @ApiProperty({ description: '错误信息', required: false })
  error?: string;
}

export class MessageTemplateDto {
  @ApiProperty({ description: '推送类型' })
  type: string;

  @ApiProperty({ description: '模板 ID' })
  templateId: string;

  @ApiProperty({ description: '模板标题' })
  title: string;
}
