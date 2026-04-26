import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock('../request', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

import { documentOperationsApi } from '../document-operations';

describe('documentOperationsApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads health metrics', () => {
    documentOperationsApi.getHealth(30);
    expect(mockGet).toHaveBeenCalledWith('/documents/control/health', { params: { days: 30 } });
  });

  it('dismisses training need with reason', () => {
    documentOperationsApi.dismissTrainingNeed('need1', 'not applicable');
    expect(mockPost).toHaveBeenCalledWith('/documents/control/training-needs/need1/dismiss', { reason: 'not applicable' });
  });
});
