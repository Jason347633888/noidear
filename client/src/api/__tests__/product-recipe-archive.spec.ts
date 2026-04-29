import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../request', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { productApi } from '../product';
import { recipeApi } from '../recipe';

describe('product and recipe archive API adapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('archives product through POST archive endpoint', async () => {
    mockPost.mockResolvedValue({ id: 'prod-1' });

    await productApi.archive('prod-1');

    expect(mockPost).toHaveBeenCalledWith('/products/prod-1/archive');
  });

  it('keeps product remove as archive compatibility wrapper', async () => {
    mockPost.mockResolvedValue({ id: 'prod-1' });

    await productApi.remove('prod-1');

    expect(mockPost).toHaveBeenCalledWith('/products/prod-1/archive');
  });

  it('loads active recipe list with archive false param', async () => {
    mockGet.mockResolvedValue([]);

    await recipeApi.getList(false);

    expect(mockGet).toHaveBeenCalledWith('/recipes', { params: { archive: false } });
  });

  it('loads archived recipe list with archive true param', async () => {
    mockGet.mockResolvedValue([]);

    await recipeApi.getList(true);

    expect(mockGet).toHaveBeenCalledWith('/recipes', { params: { archive: true } });
  });

  it('loads recipes by product with archive param', async () => {
    mockGet.mockResolvedValue([]);

    await recipeApi.getByProduct('prod-1', true);

    expect(mockGet).toHaveBeenCalledWith('/recipes/product/prod-1', { params: { archive: true } });
  });

  it('archives recipe through POST archive endpoint', async () => {
    mockPost.mockResolvedValue({ id: 'recipe-1' });

    await recipeApi.archive('recipe-1');

    expect(mockPost).toHaveBeenCalledWith('/recipes/recipe-1/archive');
  });

  it('keeps recipe remove as archive compatibility wrapper', async () => {
    mockPost.mockResolvedValue({ id: 'recipe-1' });

    await recipeApi.remove('recipe-1');

    expect(mockPost).toHaveBeenCalledWith('/recipes/recipe-1/archive');
  });
});
