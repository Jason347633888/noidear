/**
 * Unit tests for approval API module.
 *
 * These tests verify the approval API functions construct correct
 * request payloads and URLs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the request module before importing
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/api/request', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}));

import approvalApi from '@/api/approval';

describe('Approval API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({});
    mockPost.mockResolvedValue({});
  });

  describe('createApprovalChain', () => {
    it('should POST to /approvals/chains with recordId', async () => {
      await approvalApi.createApprovalChain('record-123');

      expect(mockPost).toHaveBeenCalledWith(
        '/approvals/chains',
        { recordId: 'record-123' },
      );
    });
  });

  describe('approveLevel1', () => {
    it('should POST approved action with comment', async () => {
      await approvalApi.approveLevel1('ap-1', 'approved', '同意');

      expect(mockPost).toHaveBeenCalledWith(
        '/approvals/level1/ap-1/approve',
        {
          approvalId: 'ap-1',
          action: 'approved',
          comment: '同意',
        },
      );
    });

    it('should POST rejected action with rejectionReason', async () => {
      await approvalApi.approveLevel1('ap-1', 'rejected', '数据有误，请修正后重新提交');

      expect(mockPost).toHaveBeenCalledWith(
        '/approvals/level1/ap-1/approve',
        {
          approvalId: 'ap-1',
          action: 'rejected',
          rejectionReason: '数据有误，请修正后重新提交',
        },
      );
    });
  });

  describe('approveLevel2', () => {
    it('should POST to level2 approve endpoint', async () => {
      await approvalApi.approveLevel2('ap-2', 'approved', '同意');

      expect(mockPost).toHaveBeenCalledWith(
        '/approvals/level2/ap-2/approve',
        {
          approvalId: 'ap-2',
          action: 'approved',
          comment: '同意',
        },
      );
    });
  });

  describe('getApprovalChain', () => {
    it('should GET approval chain by recordId', async () => {
      await approvalApi.getApprovalChain('record-456');

      expect(mockGet).toHaveBeenCalledWith('/approvals/chains/record-456');
    });
  });

  describe('getPendingApprovals', () => {
    it('should GET pending approvals', async () => {
      await approvalApi.getPendingApprovals();

      expect(mockGet).toHaveBeenCalledWith('/approvals/pending');
    });
  });

  describe('getApprovalDetail', () => {
    it('should GET approval detail by id', async () => {
      await approvalApi.getApprovalDetail('ap-detail-1');

      expect(mockGet).toHaveBeenCalledWith('/approvals/detail/ap-detail-1');
    });
  });

  describe('getApprovalHistory', () => {
    it('should GET approval history with default pagination', async () => {
      await approvalApi.getApprovalHistory();

      expect(mockGet).toHaveBeenCalledWith('/approvals/history', {
        params: { page: 1, limit: 20 },
      });
    });

    it('should GET approval history with custom pagination', async () => {
      await approvalApi.getApprovalHistory(2, 10);

      expect(mockGet).toHaveBeenCalledWith('/approvals/history', {
        params: { page: 2, limit: 10 },
      });
    });
  });

  describe('approveUnified', () => {
    it('should POST unified approve with comment', async () => {
      await approvalApi.approveUnified('ap-uni-1', 'approved', '同意');

      expect(mockPost).toHaveBeenCalledWith(
        '/approvals/ap-uni-1/approve',
        {
          approvalId: 'ap-uni-1',
          action: 'approved',
          comment: '同意',
        },
      );
    });

    it('should POST unified reject with rejectionReason', async () => {
      await approvalApi.approveUnified('ap-uni-2', 'rejected', '数据填写不规范，请重新填写');

      expect(mockPost).toHaveBeenCalledWith(
        '/approvals/ap-uni-2/approve',
        {
          approvalId: 'ap-uni-2',
          action: 'rejected',
          rejectionReason: '数据填写不规范，请重新填写',
        },
      );
    });

    it('should POST unified approve without comment', async () => {
      await approvalApi.approveUnified('ap-uni-3', 'approved');

      expect(mockPost).toHaveBeenCalledWith(
        '/approvals/ap-uni-3/approve',
        {
          approvalId: 'ap-uni-3',
          action: 'approved',
          comment: undefined,
        },
      );
    });
  });

  describe('rejectUnified', () => {
    it('should POST to reject endpoint with reason', async () => {
      await approvalApi.rejectUnified('ap-rej-1', 'content not valid');

      expect(mockPost).toHaveBeenCalledWith(
        '/approvals/ap-rej-1/reject',
        {
          approvalId: 'ap-rej-1',
          action: 'rejected',
          rejectionReason: 'content not valid',
        },
      );
    });
  });
});