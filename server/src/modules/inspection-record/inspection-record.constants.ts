export const INSPECTION_APPLIES_TO = [
  'material',
  'product',
  'area_point',
  'equipment',
  'supplier',
  'water',
  'vehicle',
  'personnel',
  'retained_sample',
  'shelf_life_study',
] as const;

/**
 * Standard preset codes for product and semifinished product inspection.
 * Each code maps to an InspectionStandard.code value expected to exist in the
 * tenant's master data.
 */
export const PRODUCT_INSPECTION_PRESET_CODES = [
  'PRODUCT_INSPECTION',
  'SEMIFINISHED_INSPECTION',
  'PRE_RELEASE_INSPECTION',
  'SHELF_LIFE_POINT',
] as const;

export type ProductInspectionPresetCode = (typeof PRODUCT_INSPECTION_PRESET_CODES)[number];

/**
 * Maps each product inspection preset code to the object_type used when
 * creating an InspectionRecord. SHELF_LIFE_POINT targets shelf_life_study;
 * all others target production_batch.
 */
export const PRODUCT_PRESET_OBJECT_TYPE: Record<ProductInspectionPresetCode, string> = {
  PRODUCT_INSPECTION:      'production_batch',
  SEMIFINISHED_INSPECTION: 'production_batch',
  PRE_RELEASE_INSPECTION:  'production_batch',
  SHELF_LIFE_POINT:        'shelf_life_study',
};

/**
 * Maps each applies_to value to the object_type values an InspectionRecord
 * may use when that standard is applied. If a key is absent the default
 * canonical object_type equals the applies_to value itself.
 */
export const INSPECTION_OBJECT_COMPATIBILITY: Record<string, readonly string[]> = {
  material: ['material', 'material_batch'],
  product: ['product', 'production_batch'],
  area_point: ['area_point'],
  equipment: ['equipment', 'measuring_equipment'],
  supplier: ['supplier'],
  water: ['area_point'], // water quality inspections are tied to a physical location represented as area_point
  vehicle: ['external_party', 'delivery_note'],
  personnel: ['user', 'personnel'],
  retained_sample: ['retained_sample'],
  shelf_life_study: ['shelf_life_study'],
};
