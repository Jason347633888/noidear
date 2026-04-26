import { ProcessStepApprovalService } from './process-step-approval.service';

describe('ProcessStepApprovalService', () => {
  describe('checkAllApproved', () => {
    it('should return true when all required roles approved', () => {
      const required = [{ role: 'quality' }, { role: 'manufacture' }];
      const approvals = [
        { role: 'quality', status: 'APPROVED' },
        { role: 'manufacture', status: 'APPROVED' },
      ];
      const svc = new ProcessStepApprovalService(null as any);
      expect((svc as any).checkAllApproved(required, approvals)).toBe(true);
    });

    it('should return false when one role is still PENDING', () => {
      const required = [{ role: 'quality' }, { role: 'manufacture' }];
      const approvals = [
        { role: 'quality', status: 'APPROVED' },
        { role: 'manufacture', status: 'PENDING' },
      ];
      const svc = new ProcessStepApprovalService(null as any);
      expect((svc as any).checkAllApproved(required, approvals)).toBe(false);
    });

    it('should return false when no approvals exist', () => {
      const required = [{ role: 'gm' }];
      const svc = new ProcessStepApprovalService(null as any);
      expect((svc as any).checkAllApproved(required, [])).toBe(false);
    });

    it('should return true when step has no required approvals (Step3)', () => {
      const required: unknown[] = [];
      const svc = new ProcessStepApprovalService(null as any);
      expect((svc as any).checkAllApproved(required, [])).toBe(true);
    });
  });
});
