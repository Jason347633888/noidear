import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export const NC_SOURCE_TYPES = [
  'material_batch',
  'production_batch',
  'product',
  'inspection_record',
  'sanitizer_concentration_check',
  'cleaning_record',
  'calibration_record',
  'maintenance_record',
  'metal_detection_log',
  'laundry_work_record',
] as const;
export type NcSourceType = (typeof NC_SOURCE_TYPES)[number];

/**
 * Canonical mapping: source_type -> source_item child table.
 * Sources not listed here have no detail row (source_item_id must be null).
 */
export const NC_SOURCE_ITEM_TABLE: Partial<Record<NcSourceType, string>> = {
  inspection_record: 'InspectionRecordItem',
  cleaning_record: 'CleaningRecordItem',
  calibration_record: 'CalibrationPointReading',
  maintenance_record: 'MaintenanceRecordItem',
  laundry_work_record: 'LaundryWorkRecordItem',
};

export class CreateNcDto {
  @IsIn(NC_SOURCE_TYPES)
  source_type: NcSourceType;

  @IsString()
  @IsNotEmpty()
  source_id: string;

  @IsOptional()
  @IsString()
  source_item_id?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  nc_type?: string;

  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  disposition?: string;
}

export class DisposeNcDto {
  @IsString()
  disposition: string; // 'rework'|'destroy'|'concession'|'return'
}
