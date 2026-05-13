export type KnownFormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'switch'
  | 'file'
  | 'image'
  | 'signature'
  | 'table-input'
  | 'constrained-number'
  | 'checkbox-text'
  | 'section-header'
  | 'static-content';

export type FormFieldType = KnownFormFieldType | (string & {});

export type FormValidationSeverity = 'error' | 'warning';

export interface FormOption {
  label: string;
  value: string | number | boolean;
}

export interface FormValidationRule {
  type:
    | 'required'
    | 'min'
    | 'max'
    | 'pattern'
    | 'minLength'
    | 'maxLength'
    | 'rowRequired'
    | 'checkedTextRequired'
    | 'approvalRequired';
  value?: unknown;
  message?: string;
  when?: {
    field: string;
    equals: unknown;
  };
}

export interface FormValidationField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  min?: number;
  max?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  options?: FormOption[];
  columns?: Array<{
    key: string;
    label: string;
    required?: boolean;
    readonly?: boolean;
    type?: FormFieldType;
  }>;
  rowSchema?: FormValidationField[];
  validation?: FormValidationRule[];
  visibility?: {
    field: string;
    equals: unknown;
  };
  children?: FormValidationField[];
  [key: string]: unknown;
}

export interface FormValidationError {
  fieldKey: string;
  errorCode: string;
  message: string;
  severity: FormValidationSeverity;
  rowIndex?: number;
  childKey?: string;
}

export interface FormValidationResult {
  valid: boolean;
  errors: FormValidationError[];
}
