import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import {
  WechatMessageType,
  SubscribeMessageDto,
  SubscribeMessageResponseDto,
  MessageTemplateDto,
} from './dto';

const MAX_RETRIES = 3;

interface WechatApiResponse {
  errcode: number;
  errmsg: string;
}

@Injectable()
export class WechatService {
  private readonly appId: string;
  private readonly appSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  // 消息模板配置（从环境变量读取）
  private readonly templates: Map<string, { templateId: string; title: string }>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.appId = this.configService.get<string>('WECHAT_APP_ID', '');
    this.appSecret = this.configService.get<string>('WECHAT_APP_SECRET', '');

    // 从环境变量加载模板配置
    this.templates = new Map([
      [
        WechatMessageType.TODO_REMIND,
        {
          templateId: this.configService.get<string>('WECHAT_TPL_TODO_REMIND', ''),
          title: '待办提醒',
        },
      ],
      [
        WechatMessageType.EXPIRY_WARNING,
        {
          templateId: this.configService.get<string>('WECHAT_TPL_EXPIRY_WARNING', ''),
          title: '临期预警',
        },
      ],
      [
        WechatMessageType.APPROVAL_NOTICE,
        {
          templateId: this.configService.get<string>('WECHAT_TPL_APPROVAL_NOTICE', ''),
          title: '审批通知',
        },
      ],
    ]);
  }

  /**
   * 发送订阅消息
   */
  async sendSubscribeMessage(
    dto: SubscribeMessageDto,
  ): Promise<SubscribeMessageResponseDto> {
    // 创建消息记录
    const message = await this.prisma.wechatMessage.create({
      data: {
        type: dto.type,
        templateId: dto.templateId,
        touser: dto.touser,
        data: dto.data as object,
        status: 'pending',
      },
    });

    // 尝试发送（含重试逻辑）
    const result = await this.sendWithRetry(message.id, dto);

    return result;
  }

  /**
   * 带重试的消息发送
   */
  private async sendWithRetry(
    messageId: string,
    dto: SubscribeMessageDto,
  ): Promise<SubscribeMessageResponseDto> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await this.callWechatApi(dto);

        // 发送成功，更新记录
        await this.prisma.wechatMessage.update({
          where: { id: messageId },
          data: {
            status: 'sent',
            sentAt: new Date(),
            retries: attempt,
          },
        });

        return { id: messageId, status: 'sent' };
      } catch (error) {
        lastError = error instanceof Error ? error.message : '发送失败';

        // 更新重试次数
        await this.prisma.wechatMessage.update({
          where: { id: messageId },
          data: {
            retries: attempt + 1,
            error: lastError,
          },
        });

        // 如果不是最后一次重试，等待后再试
        if (attempt < MAX_RETRIES - 1) {
          await this.delay(1000 * (attempt + 1)); // 递增延迟
        }
      }
    }

    // 所有重试失败
    await this.prisma.wechatMessage.update({
      where: { id: messageId },
      data: { status: 'failed', error: lastError },
    });

    return { id: messageId, status: 'failed', error: lastError };
  }

  /**
   * 调用微信 API 发送订阅消息
   */
  async callWechatApi(dto: SubscribeMessageDto): Promise<void> {
    const token = await this.getAccessToken();

    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: dto.touser,
        template_id: dto.templateId,
        data: dto.data,
      }),
    });

    const result = (await response.json()) as WechatApiResponse;

    if (result.errcode !== 0) {
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        `微信 API 调用失败: ${result.errmsg} (errcode: ${result.errcode})`,
      );
    }
  }

  /**
   * 获取微信 access_token（带缓存）
   */
  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    if (!this.appId || !this.appSecret) {
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        '微信 AppID 或 AppSecret 未配置',
      );
    }

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;

    const response = await fetch(url);
    const result = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      errcode?: number;
      errmsg?: string;
    };

    if (!result.access_token) {
      throw new BusinessException(
        ErrorCode.INTERNAL_ERROR,
        `获取微信 access_token 失败: ${result.errmsg || '未知错误'}`,
      );
    }

    this.accessToken = result.access_token;
    // 提前 5 分钟过期
    this.tokenExpiresAt = Date.now() + (result.expires_in! - 300) * 1000;

    return this.accessToken;
  }

  /**
   * 查询消息模板列表
   */
  getTemplates(): MessageTemplateDto[] {
    const result: MessageTemplateDto[] = [];

    for (const [type, config] of this.templates.entries()) {
      if (config.templateId) {
        result.push({
          type,
          templateId: config.templateId,
          title: config.title,
        });
      }
    }

    return result;
  }

  /**
   * 查询消息推送历史
   */
  async getMessageHistory(
    touser: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where = { touser };

    const [list, total] = await Promise.all([
      this.prisma.wechatMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.wechatMessage.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
