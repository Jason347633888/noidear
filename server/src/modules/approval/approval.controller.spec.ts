import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { ApproveDto } from './dto';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { StatisticsService } from '../statistics/statistics.service';
import { StatisticsCacheInterceptor } from '../../common/interceptors/statistics-cache.interceptor';

describe('ApprovalController', () => {
  let controller: ApprovalController;

  const mockApprovalService = {
    getApprovalChain: jest.fn(),
    getPendingApprovals: jest.fn(),
    getApprovalDetail: jest.fn(),
    getApprovalHistory: jest.fn(),
    approveUnified: jest.fn(),
  };

  const mockStatisticsService = {
    clearCaches: jest.fn().mockResolvedValue(undefined),
    getDocumentStatistics: jest.fn(),
    getTaskStatistics: jest.fn(),
    getApprovalStatistics: jest.fn(),
    getOverviewStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApprovalController],
      providers: [
        { provide: ApprovalService, useValue: mockApprovalService },
        { provide: StatisticsService, useValue: mockStatisticsService },
        { provide: StatisticsCacheInterceptor, useValue: { intercept: jest.fn((ctx, next) => next.handle()) } },
      ],
    }).compile();

    controller = module.get<ApprovalController>(ApprovalController);
    jest.clearAllMocks();
  });

  describe('GET /approvals/chains/:documentId', () => {
    it('应该返回文档审批链', async () => {
      const documentId = 'doc-123';
      const mockApprovals = [
        { id: 'approval-1', documentId, level: 1, status: 'approved', approver: { id: 'user-1', name: '张三' } },
        { id: 'approval-2', documentId, level: 2, status: 'pending', approver: { id: 'user-2', name: '李四' } },
      ];

      mockApprovalService.getApprovalChain.mockResolvedValue(mockApprovals);

      const result = await controller.getApprovalChain(documentId);

      expect(result).toEqual(mockApprovals);
      expect(result).toHaveLength(2);
      expect(mockApprovalService.getApprovalChain).toHaveBeenCalledWith(documentId);
    });

    it('应该在文档不存在时返回空数组', async () => {
      mockApprovalService.getApprovalChain.mockResolvedValue([]);

      const result = await controller.getApprovalChain('non-exist');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('GET /approvals/pending', () => {
    it('应该返回当前用户的待审批列表', async () => {
      const req = { user: { userId: 'supervisor-456' } };
      const mockPending = [
        { id: 'approval-1', status: 'pending', level: 1 },
        { id: 'approval-2', status: 'pending', level: 1 },
      ];

      mockApprovalService.getPendingApprovals.mockResolvedValue(mockPending);

      const result = await controller.getPendingApprovals(req);

      expect(result).toEqual(mockPending);
      expect(result).toHaveLength(2);
      expect(mockApprovalService.getPendingApprovals).toHaveBeenCalledWith('supervisor-456');
    });

    it('应该在没有待审批时返回空数组', async () => {
      const req = { user: { userId: 'user-no-pending' } };
      mockApprovalService.getPendingApprovals.mockResolvedValue([]);

      const result = await controller.getPendingApprovals(req);

      expect(result).toEqual([]);
    });
  });

  describe('GET /approvals/detail/:id', () => {
    it('应该返回审批详情', async () => {
      const approvalId = 'approval-detail-1';
      const mockDetail = {
        id: approvalId,
        status: 'pending',
        level: 1,
        approver: { id: 'supervisor-456', name: '主管张三' },
        document: { id: 'doc-1', title: '测试文档' },
      };

      mockApprovalService.getApprovalDetail.mockResolvedValue(mockDetail);

      const result = await controller.getApprovalDetail(approvalId);

      expect(result).toEqual(mockDetail);
      expect(mockApprovalService.getApprovalDetail).toHaveBeenCalledWith(approvalId);
    });

    it('应该在审批不存在时返回错误', async () => {
      mockApprovalService.getApprovalDetail.mockRejectedValue(
        new BusinessException(ErrorCode.NOT_FOUND, '审批记录不存在'),
      );

      await expect(controller.getApprovalDetail('non-exist')).rejects.toThrow(BusinessException);
    });
  });

  describe('GET /approvals/history', () => {
    it('应该返回当前用户的审批历史', async () => {
      const req = { user: { userId: 'supervisor-456' } };
      const query = { page: 1, limit: 20 };
      const mockHistory = {
        list: [{ id: 'approval-h1', status: 'approved' }],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockApprovalService.getApprovalHistory.mockResolvedValue(mockHistory);

      const result = await controller.getApprovalHistory(req, query);

      expect(result).toEqual(mockHistory);
      expect(mockApprovalService.getApprovalHistory).toHaveBeenCalledWith('supervisor-456', 1, 20);
    });

    it('应该使用默认分页参数', async () => {
      const req = { user: { userId: 'supervisor-456' } };
      const mockHistory = { list: [], total: 0, page: 1, limit: 20 };

      mockApprovalService.getApprovalHistory.mockResolvedValue(mockHistory);

      await controller.getApprovalHistory(req, {});

      expect(mockApprovalService.getApprovalHistory).toHaveBeenCalledWith('supervisor-456', 1, 20);
    });
  });

  describe('POST /approvals/:id/approve', () => {
    it('应该通过统一接口处理审批通过', async () => {
      const approvalId = 'approval-1';
      const dto = { action: 'approved', comment: '同意' } as ApproveDto;
      const req = { user: { userId: 'supervisor-456' } };
      const mockResult = { id: approvalId, status: 'approved' };

      mockApprovalService.approveUnified.mockResolvedValue(mockResult);

      const result = await controller.approveUnified(approvalId, dto, req);

      expect(result).toEqual(mockResult);
      expect(mockApprovalService.approveUnified).toHaveBeenCalledWith(
        approvalId, 'supervisor-456', 'approved', '同意',
      );
    });

    it('应该通过统一接口处理审批驳回', async () => {
      const approvalId = 'approval-1';
      const dto = { action: 'rejected', rejectionReason: '数据填写不规范，请重新填写' } as ApproveDto;
      const req = { user: { userId: 'supervisor-456' } };
      const mockResult = { id: approvalId, status: 'rejected' };

      mockApprovalService.approveUnified.mockResolvedValue(mockResult);

      const result = await controller.approveUnified(approvalId, dto, req);

      expect(result).toEqual(mockResult);
      expect(mockApprovalService.approveUnified).toHaveBeenCalledWith(
        approvalId, 'supervisor-456', 'rejected', '数据填写不规范，请重新填写',
      );
    });

    it('应该在权限不足时返回错误', async () => {
      const dto = { action: 'approved', comment: '同意' } as ApproveDto;
      const req = { user: { userId: 'wrong-user' } };

      mockApprovalService.approveUnified.mockRejectedValue(
        new BusinessException(ErrorCode.FORBIDDEN, '无权审批此记录'),
      );

      await expect(controller.approveUnified('approval-1', dto, req)).rejects.toThrow(BusinessException);
    });
  });

  describe('POST /approvals/:id/reject', () => {
    it('应该通过 reject 端点驳回审批', async () => {
      const approvalId = 'approval-reject-1';
      const dto = { action: 'rejected', rejectionReason: '内容不符合规范要求，请修改后重新提交' } as ApproveDto;
      const req = { user: { userId: 'supervisor-456' } };
      const mockResult = { id: approvalId, status: 'rejected' };

      mockApprovalService.approveUnified.mockResolvedValue(mockResult);

      const result = await controller.rejectUnified(approvalId, dto, req);

      expect(result).toEqual(mockResult);
      expect(mockApprovalService.approveUnified).toHaveBeenCalledWith(
        approvalId, 'supervisor-456', 'rejected', '内容不符合规范要求，请修改后重新提交',
      );
    });

    it('应该在 reject 端点传入 approved action 时仍强制为 rejected', async () => {
      const approvalId = 'approval-reject-2';
      const dto = { action: 'approved', rejectionReason: '内容不符合规范要求，请修改后重新提交' } as ApproveDto;
      const req = { user: { userId: 'supervisor-456' } };
      const mockResult = { id: approvalId, status: 'rejected' };

      mockApprovalService.approveUnified.mockResolvedValue(mockResult);

      const result = await controller.rejectUnified(approvalId, dto, req);

      expect(result).toEqual(mockResult);
      expect(mockApprovalService.approveUnified).toHaveBeenCalledWith(
        approvalId, 'supervisor-456', 'rejected', '内容不符合规范要求，请修改后重新提交',
      );
    });
  });
});
