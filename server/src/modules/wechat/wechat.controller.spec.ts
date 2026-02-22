import { Test, TestingModule } from '@nestjs/testing';
import { WechatController } from './wechat.controller';
import { WechatService } from './wechat.service';
import { WechatMessageType } from './dto';

describe('WechatController', () => {
  let controller: WechatController;
  let wechatService: any;

  beforeEach(async () => {
    wechatService = {
      sendSubscribeMessage: jest.fn(),
      getTemplates: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WechatController],
      providers: [
        { provide: WechatService, useValue: wechatService },
      ],
    }).compile();

    controller = module.get<WechatController>(WechatController);
  });

  describe('sendSubscribeMessage', () => {
    it('should call wechatService.sendSubscribeMessage with dto', async () => {
      const mockResponse = { id: 'msg-1', status: 'sent' };
      wechatService.sendSubscribeMessage.mockResolvedValue(mockResponse);

      const dto = {
        type: WechatMessageType.TODO_REMIND,
        templateId: 'tpl-todo',
        touser: 'openid-123',
        data: { thing1: { value: '待办标题' } },
      };

      const result = await controller.sendSubscribeMessage(dto);

      expect(wechatService.sendSubscribeMessage).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });

    it('should handle expiry warning messages', async () => {
      const mockResponse = { id: 'msg-2', status: 'sent' };
      wechatService.sendSubscribeMessage.mockResolvedValue(mockResponse);

      const dto = {
        type: WechatMessageType.EXPIRY_WARNING,
        templateId: 'tpl-expiry',
        touser: 'openid-456',
        data: { thing1: { value: '物料A' } },
      };

      const result = await controller.sendSubscribeMessage(dto);
      expect(result.status).toBe('sent');
    });

    it('should propagate errors from service', async () => {
      wechatService.sendSubscribeMessage.mockRejectedValue(
        new Error('Service error'),
      );

      const dto = {
        type: WechatMessageType.TODO_REMIND,
        templateId: 'tpl-todo',
        touser: 'openid-123',
        data: { thing1: { value: 'test' } },
      };

      await expect(
        controller.sendSubscribeMessage(dto),
      ).rejects.toThrow('Service error');
    });
  });

  describe('getTemplates', () => {
    it('should return list of templates', () => {
      const mockTemplates = [
        { type: 'todo_remind', templateId: 'tpl-todo', title: '待办提醒' },
      ];
      wechatService.getTemplates.mockReturnValue(mockTemplates);

      const result = controller.getTemplates();

      expect(wechatService.getTemplates).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no templates configured', () => {
      wechatService.getTemplates.mockReturnValue([]);

      const result = controller.getTemplates();
      expect(result).toHaveLength(0);
    });
  });
});
