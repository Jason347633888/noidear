import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import ProductByPlanRedirect from '../ProductByPlanRedirect.vue';

vi.mock('@/api/product-process-change', () => ({
  productProcessChangeApi: {
    getByPlanId: vi.fn().mockResolvedValue({ id: 'plan-1', product_id: 'prod-9' } as any),
  },
}));

const replace = vi.fn();
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { planId: 'plan-1' } }),
  useRouter: () => ({ replace }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  vLoading: {},
}));

describe('ProductByPlanRedirect', () => {
  it('redirects to product detail by planId', async () => {
    mount(ProductByPlanRedirect);
    await flushPromises();
    expect(replace).toHaveBeenCalledWith('/products/prod-9');
  });
});
