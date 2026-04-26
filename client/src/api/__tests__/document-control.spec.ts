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

import { documentControlApi } from '../document-control';

describe('documentControlApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists documents with filters', () => {
    documentControlApi.listDocuments({ documentType: 'PROCEDURE' });
    expect(mockGet).toHaveBeenCalledWith('/documents', { params: { documentType: 'PROCEDURE' } });
  });

  it('lists record form landing index', () => {
    documentControlApi.listRecordFormIndex({ department: '产品开发部' });
    expect(mockGet).toHaveBeenCalledWith('/documents/record-form-index', { params: { department: '产品开发部' } });
  });

  it('loads workbench with days parameter', () => {
    documentControlApi.getWorkbench(45);
    expect(mockGet).toHaveBeenCalledWith('/documents/control/workbench', { params: { days: 45 } });
  });
});
