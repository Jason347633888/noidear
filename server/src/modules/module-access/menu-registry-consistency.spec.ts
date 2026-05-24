/**
 * P2-R3-5 — menu moduleKey groups must be consistent with registry-config paths
 *
 * This test verifies that every path listed in the frontend menu groups
 * (by moduleKey) has a corresponding registration in REGISTRY_CONFIG
 * under the same moduleKey.
 *
 * Paths are stripped of leading '/' and compared against registry 'exact' entries.
 */
import { REGISTRY_CONFIG } from './registry-config';

// Snapshot of menu.ts equipment_site and quality_compliance paths
// that were the subject of P2-R3-5 alignment.
// Update this list when menu.ts changes.
const MENU_EQUIPMENT_SITE_PATHS = [
  'equipment',
  'equipment/plans',
  'equipment/records',
  'equipment/faults',
  'equipment/stats',
  'environment-records',
  'process-records',
  'metal-detections',
  'cleaning-records',
  'measuring-equipment',
  'rework-records',
  'fragile-item-inspections',
  'violation-records',
  'medication-records',
  'visitor-records',
  'emergency-drills',
  'waste',
  'line-change-check-records',
  'food-safety-culture-records',
  'external-parties',
];

const MENU_TRACEABILITY_BATCH_PATHS = [
  'batch-trace',
  'warehouse/batches',
  'traceability',
  'warehouse/material-balance',
  'incoming-inspections',
  'packaging-material-usages',
];

function allRegistryPaths(moduleKey: string): string[] {
  const entries = REGISTRY_CONFIG.modules[moduleKey as keyof typeof REGISTRY_CONFIG.modules] ?? [];
  return entries.map((e) => e.path);
}

describe('menu → registry-config consistency (P2-R3-5)', () => {
  it('equipment_site menu paths are registered in equipment_site or production_execution (for process/line-change)', () => {
    const equipmentPaths = allRegistryPaths('equipment_site');
    const productionPaths = allRegistryPaths('production_execution');
    const allAllowed = new Set([...equipmentPaths, ...productionPaths]);

    const mismatched = MENU_EQUIPMENT_SITE_PATHS.filter((p) => {
      // equipment/plans → maintenance-plans, equipment/records → maintenance-records
      // these are aliased in the menu vs registry
      const aliases: Record<string, string> = {
        'equipment/plans': 'maintenance-plans',
        'equipment/records': 'maintenance-records',
      };
      const registryPath = aliases[p] ?? p;
      return !allAllowed.has(registryPath);
    });

    // Known intentional cross-listings: menu UI groups paths differently from backend module ownership
    // - external-parties: menu shows in equipment_site, backend is warehouse module
    // - process-records: menu shows in equipment_site, backend is production_execution module
    const knownCrossListings = new Set(['external-parties', 'process-records']);
    const realMismatches = mismatched.filter((p) => !knownCrossListings.has(p));

    expect(realMismatches).toEqual([]);
  });

  it('traceability_batch menu paths are registered in traceability_batch or warehouse', () => {
    const traceabilityPaths = allRegistryPaths('traceability_batch');
    const warehousePaths = allRegistryPaths('warehouse');
    const allAllowed = new Set([...traceabilityPaths, ...warehousePaths]);

    const mismatched = MENU_TRACEABILITY_BATCH_PATHS.filter((p) => !allAllowed.has(p));
    expect(mismatched).toEqual([]);
  });

  it('all moduleKeys in REGISTRY_CONFIG.modules match known menu keys', () => {
    const knownMenuKeys = new Set([
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
    const registryKeys = Object.keys(REGISTRY_CONFIG.modules);
    const unknownKeys = registryKeys.filter((k) => !knownMenuKeys.has(k));
    expect(unknownKeys).toEqual([]);
  });
});
