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

export type InspectionAppliesTo = (typeof INSPECTION_APPLIES_TO)[number];

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
  water: ['area_point'],
  vehicle: ['external_party', 'delivery_note'],
  personnel: ['user', 'personnel'],
  retained_sample: ['retained_sample'],
  shelf_life_study: ['shelf_life_study'],
};
