export type FieldType =
  | 'text' | 'number' | 'date' | 'datetime' | 'boolean'
  | 'enum' | 'multi-enum'
  | 'inspection-table'
  | 'checklist'
  | 'photo'
  | 'signature'
  | 'entity-link';

export type EntityType =
  | 'shift_instance' | 'production_run' | 'material_lot' | 'supplier'
  | 'production_batch' | 'finished_goods_batch' | 'product' | 'recipe' | 'equipment';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  unit?: string;
  defaultValue?: unknown;
  options?: string[];
  validRange?: { min?: number; max?: number };
  entity?: EntityType;
  autoFill?: boolean;
  inspectionRows?: Array<{ item: string; standard: string }>;
  checklistItems?: string[];
}

export interface SectionDef {
  title: string;
  fields: FieldDef[];
}

export interface ConditionalRule {
  when: { field: string; equals: unknown };
  show: string[];
}

export interface FieldsJson {
  sections: SectionDef[];
  conditionalRules?: ConditionalRule[];
}
