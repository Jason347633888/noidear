import { describe, it, expect } from 'vitest';
import router from '@/router';
import { menuGroups } from '@/navigation/menu';

describe('product development routes', () => {
  it('resolves /products/profiles', () => {
    const resolved = router.resolve('/products/profiles');
    expect(resolved.name).toBe('ProductProfiles');
  });

  it('resolves /products/:id/profile', () => {
    const resolved = router.resolve('/products/abc123/profile');
    expect(resolved.name).toBe('ProductProfile');
    expect(resolved.params.id).toBe('abc123');
  });

  it('resolves /products/:id/allergens', () => {
    const resolved = router.resolve('/products/abc123/allergens');
    expect(resolved.name).toBe('ProductAllergens');
    expect(resolved.params.id).toBe('abc123');
  });

  it('resolves /products/:id/risk-zone', () => {
    const resolved = router.resolve('/products/abc123/risk-zone');
    expect(resolved.name).toBe('ProductRiskZone');
    expect(resolved.params.id).toBe('abc123');
  });

  it('resolves /products/:id/validation', () => {
    const resolved = router.resolve('/products/abc123/validation');
    expect(resolved.name).toBe('ProductValidation');
    expect(resolved.params.id).toBe('abc123');
  });

  it('resolves /recipes/:id/version', () => {
    const resolved = router.resolve('/recipes/r1/version');
    expect(resolved.name).toBe('RecipeVersion');
    expect(resolved.params.id).toBe('r1');
  });

  it('resolves /product-process-changes/:id/impact', () => {
    const resolved = router.resolve('/product-process-changes/p1/impact');
    expect(resolved.name).toBe('ProductProcessChangeImpact');
    expect(resolved.params.id).toBe('p1');
  });
});

describe('product development menu group', () => {
  const group = menuGroups.find((g) => g.title === '产品开发');

  it('has a 产品开发 menu group', () => {
    expect(group).toBeDefined();
  });

  it('contains 产品过敏原 entry', () => {
    expect(group?.children?.some((c) => c.title === '产品过敏原')).toBe(true);
  });

  it('contains 产品风险区 entry', () => {
    expect(group?.children?.some((c) => c.title === '产品风险区')).toBe(true);
  });

  it('contains 产品验证 entry', () => {
    expect(group?.children?.some((c) => c.title === '产品验证')).toBe(true);
  });

  it('contains 配方版本 entry', () => {
    expect(group?.children?.some((c) => c.title === '配方版本')).toBe(true);
  });
});
