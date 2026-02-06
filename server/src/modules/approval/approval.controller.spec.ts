import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';

describe('ApprovalController', () => {
  let controller: ApprovalController;
  let service: ApprovalService;

  const mockApprovalService = {
    createApprovalChain: jest.fn(),
    approveLevel1: jest.fn(),
    approveLevel2: jest.fn(),
    getApprovalChain: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApprovalController],
      providers: [{ provide: ApprovalService, useValue: mockApprovalService }],
    }).compile();

    controller = module.get<ApprovalController>(ApprovalController);
    service = module.get<ApprovalService>(ApprovalService);

    jest.clearAllMocks();
  });

  describe('POST /approvals/chains', () => {
    it('应该创建审批链', async () => {
      const dto = { recordId: 'record-123' };
      const req = { user: { userId: 'user-123' } };

      const mockApproval = {
        id: 'approval-1',
        recordId: 'record-123',
        level: 1,
        status: 'pending',
      };

      mockApprovalService.createApprovalChain.mockResolvedValue(mockApproval);

      const result = await controller.createApprovalChain(dto, req);

      expect(result).toEqual(mockApproval);
      expect(mockApprovalService.createApprovalChain).toHaveBeenCalledWith(
        'record-123',
        'user-123',
      );
    });

    it('应该在记录不存在时返回错误', async () => {
      const dto = { recordId: 'non-exist' };
      const req = { user: { userId: 'user-123' } };

      mockApprovalService.createApprovalChain.mockRejectedValue(
        new BusinessException(ErrorCode.NOT_FOUND, '任务记录不存在'),
      );

      await expect(controller.createApprovalChain(dto, req)).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('POST /approvals/level1/:id/approve', () => {
    it('应该允许通过一级审批', async () => {
      const approvalId = 'approval-1';
      const dto = { approvalId, action: 'approved', comment: '同意' };
      const req = { user: { userId: 'supervisor-456' } };

      const mockApproval = {
        id: approvalId,
        status: 'approved',
        comment: '同意',
      };

      mockApprovalService.approveLevel1.mockResolvedValue(mockApproval);

      const result = await controller.approveLevel1(approvalId, dto, req);

      expect(result).toEqual(mockApproval);
      expect(mockApprovalService.approveLevel1).toHaveBeenCalledWith(
        approvalId,
        'supervisor-456',
        'approved',
        '同意',
      );
    });

    it('应该允许驳回一级审批', async () => {
      const approvalId = 'approval-1';
      const dto = { approvalId, action: 'rejected', rejectionReason: '数据填写不规范，请重新填写' };
      const req = { user: { userId: 'supervisor-456' } };

      const mockApproval = {
        id: approvalId,
        status: 'rejected',
        rejectionReason: '数据填写不规范，请重新填写',
      };

      mockApprovalService.approveLevel1.mockResolvedValue(mockApproval);

      const result = await controller.approveLevel1(approvalId, dto, req);

      expect(result).toEqual(mockApproval);
      expect(mockApprovalService.approveLevel1).toHaveBeenCalledWith(
        approvalId,
        'supervisor-456',
        'rejected',
        '数据填写不规范，请重新填写',
      );
    });

    it('应该在权限不足时返回错误', async () => {
      const approvalId = 'approval-1';
      const dto = { approvalId, action: 'approved', comment: '同意' };
      const req = { user: { userId: 'wrong-user' } };

      mockApprovalService.approveLevel1.mockRejectedValue(
        new BusinessException(ErrorCode.FORBIDDEN, '无权审批此记录'),
      );

      await expect(controller.approveLevel1(approvalId, dto, req)).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('POST /approvals/level2/:id/approve', () => {
    it('应该允许通过二级审批', async () => {
      const approvalId = 'approval-2';
      const dto = { approvalId, action: 'approved', comment: '同意' };
      const req = { user: { userId: 'manager-789' } };

      const mockApproval = {
        id: approvalId,
        status: 'approved',
        comment: '同意',
      };

      mockApprovalService.approveLevel2.mockResolvedValue(mockApproval);

      const result = await controller.approveLevel2(approvalId, dto, req);

      expect(result).toEqual(mockApproval);
      expect(mockApprovalService.approveLevel2).toHaveBeenCalledWith(
        approvalId,
        'manager-789',
        'approved',
        '同意',
      );
    });

    it('应该允许驳回二级审批', async () => {
      const approvalId = 'approval-2';
      const dto = { approvalId, action: 'rejected', rejectionReason: '偏离理由不充分，请重新填写' };
      const req = { user: { userId: 'manager-789' } };

      const mockApproval = {
        id: approvalId,
        status: 'rejected',
        rejectionReason: '偏离理由不充分，请重新填写',
      };

      mockApprovalService.approveLevel2.mockResolvedValue(mockApproval);

      const result = await controller.approveLevel2(approvalId, dto, req);

      expect(result).toEqual(mockApproval);
      expect(mockApprovalService.approveLevel2).toHaveBeenCalledWith(
        approvalId,
        'manager-789',
        'rejected',
        '偏离理由不充分，请重新填写',
      );
    });

    it('应该在一级未完成时返回错误', async () => {
      const approvalId = 'approval-2';
      const dto = { approvalId, action: 'approved', comment: '同意' };
      const req = { user: { userId: 'manager-789' } };

      mockApprovalService.approveLevel2.mockRejectedValue(
        new BusinessException(ErrorCode.CONFLICT, '必须先通过一级审批'),
      );

      await expect(controller.approveLevel2(approvalId, dto, req)).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('GET /approvals/chains/:recordId', () => {
    it('应该返回审批链', async () => {
      const recordId = 'record-123';

      const mockApprovals = [
        {
          id: 'approval-1',
          recordId,
          level: 1,
          status: 'approved',
          approver: { id: 'supervisor-456', name: '主管张三' },
        },
        {
          id: 'approval-2',
          recordId,
          level: 2,
          status: 'pending',
          approver: { id: 'manager-789', name: '经理李四' },
        },
      ];

      mockApprovalService.getApprovalChain.mockResolvedValue(mockApprovals);

      const result = await controller.getApprovalChain(recordId);

      expect(result).toEqual(mockApprovals);
      expect(result).toHaveLength(2);
      expect(mockApprovalService.getApprovalChain).toHaveBeenCalledWith(recordId);
    });

    it('应该在记录不存在时返回空数组', async () => {
      const recordId = 'non-exist';

      mockApprovalService.getApprovalChain.mockResolvedValue([]);

      const result = await controller.getApprovalChain(recordId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});
