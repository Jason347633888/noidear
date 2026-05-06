export type FieldType =
  | 'text' | 'textarea' | 'number'
  | 'date' | 'time' | 'datetime' | 'daterange' | 'timerange'
  | 'email' | 'phone' | 'url' | 'password'
  | 'boolean' | 'switch'
  | 'enum' | 'multi-enum' | 'select' | 'radio' | 'checkbox' | 'multiselect'
  | 'cascader' | 'slider' | 'rate' | 'color'
  | 'file' | 'image' | 'photo'
  | 'inspection-table'
  | 'table-input'
  | 'checklist'
  | 'signature'
  | 'entity-link'
  | 'richtext'
  | 'range-select'
  | 'constrained-number'
  | 'checkbox-text'
  | 'auto-username'
  | 'auto-date'
  | 'auto-display'
  | 'section-header'
  | 'static-content'
  | 'template-content'
  | 'approval-step'
  | 'location'
  | 'qrcode'
  | 'barcode'
  | 'tree';

// Historical compatibility only. New batch-linked templates should use production_batch.
export type EntityType =
  | 'shift_instance' | 'production_run' | 'material_lot' | 'supplier'
  | 'production_batch' | 'finished_goods_batch' | 'product' | 'recipe' | 'equipment';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  disabled?: boolean;
  unit?: string;
  defaultValue?: unknown;
  /** Enum / multi-enum options. Stored as label+value objects to support display labels distinct from values. */
  options?: Array<{ label: string; value: string }>;
  /** Numeric range validation. Stored flat on the field (not nested as validRange). */
  min?: number;
  max?: number;
  /** Tolerance band for numeric deviation checks. */
  tolerance?: { type: 'range' | 'percentage'; min: number; max: number };
  /** Form UI rendering hints - no business logic. */
  placeholder?: string;
  pattern?: string;
  patternMessage?: string;
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

/**
 * Full-template fieldsJson shape used by the create/update template DTO paths.
 * The `updateFields` (designer patch) path stores `{ fields: FieldDef[] }` directly -
 * a flat structure without sections - and does NOT use this interface.
 */
export interface FieldsJson {
  sections: SectionDef[];
  conditionalRules?: ConditionalRule[];
}
