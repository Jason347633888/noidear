import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../request', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

import request from '../request';
import {
  productDevelopmentApi,
} from '../product-development';

describe('productDevelopmentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getProfiles calls GET /products/profiles', async () => {
    await productDevelopmentApi.getProfiles();
    expect(request.get).toHaveBeenCalledWith('/products/profiles');
  });

  it('getProfile calls GET /products/:id/profile', async () => {
    await productDevelopmentApi.getProfile('abc');
    expect(request.get).toHaveBeenCalledWith('/products/abc/profile');
  });

  it('getAllergens calls GET /products/:id/allergens', async () => {
    await productDevelopmentApi.getAllergens('abc');
    expect(request.get).toHaveBeenCalledWith('/products/abc/allergens');
  });

  it('getRiskZone calls GET /products/:id/risk-zone', async () => {
    await productDevelopmentApi.getRiskZone('abc');
    expect(request.get).toHaveBeenCalledWith('/products/abc/risk-zone');
  });

  it('getValidation calls GET /products/:id/validation', async () => {
    await productDevelopmentApi.getValidation('abc');
    expect(request.get).toHaveBeenCalledWith('/products/abc/validation');
  });

  it('getRecipeVersion calls GET /recipes/:id/version', async () => {
    await productDevelopmentApi.getRecipeVersion('r1');
    expect(request.get).toHaveBeenCalledWith('/recipes/r1/version');
  });

  it('getProcessChangeImpact calls GET /product-process-changes/:id/impact', async () => {
    await productDevelopmentApi.getProcessChangeImpact('p1');
    expect(request.get).toHaveBeenCalledWith('/product-process-changes/p1/impact');
  });
});
