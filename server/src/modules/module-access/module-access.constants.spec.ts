import {
  MODULE_KEYS,
  MODULE_LABELS,
  isModuleKey,
  type ModuleKey,
} from './module-access.constants';

describe('MODULE_KEYS', () => {
  it('exposes exactly the 9 business module keys defined by spec', () => {
    expect(MODULE_KEYS).toEqual([
      'work_execution',
      'document_approval',
      'production_execution',
      'product_rd',
      'quality_compliance',
      'equipment_site',
      'traceability_batch',
      'warehouse',
      'training',
    ]);
  });

  it('provides Chinese labels for every key', () => {
    MODULE_KEYS.forEach((k) => {
      expect(MODULE_LABELS[k as ModuleKey]).toBeTruthy();
    });
  });

  it('isModuleKey accepts only known keys', () => {
    expect(isModuleKey('warehouse')).toBe(true);
    expect(isModuleKey('quality_manager')).toBe(false);
    expect(isModuleKey('')).toBe(false);
  });
});
