import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import request from '@/api/request';
import productRecallApi from '@/api/product-recall';

describe('productRecallApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (request.get as any).mockResolvedValue({ data: [] });
    (request.post as any).mockResolvedValue({ data: {} });
  });

  it('calls /product-recalls for list', async () => {
    await productRecallApi.getList();
    expect(request.get).toHaveBeenCalledWith('/product-recalls', { params: undefined });
  });

  it('calls /product-recalls/:id for detail', async () => {
    const id = 'recall-1';
    await productRecallApi.getDetail(id);
    expect(request.get).toHaveBeenCalledWith(`/product-recalls/${id}`);
  });

  it('calls /product-recalls/:id/submit', async () => {
    const id = 'recall-1';
    await productRecallApi.submit(id);
    expect(request.post).toHaveBeenCalledWith(`/product-recalls/${id}/submit`);
  });

  it('calls /product-recalls/:id/notifications/:notificationId/mark-sent', async () => {
    const id = 'recall-1';
    const notificationId = 'notif-1';
    await productRecallApi.markNotificationSent(id, notificationId, '已通知');
    expect(request.post).toHaveBeenCalledWith(
      `/product-recalls/${id}/notifications/${notificationId}/mark-sent`,
      { response_summary: '已通知' },
    );
  });
});
