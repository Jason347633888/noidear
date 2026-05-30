import { IsString, IsOptional, IsInt, IsNumber } from 'class-validator';

export class CreateEquipmentDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() serial_no?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsInt() calibration_cycle_days?: number;
  @IsOptional() @IsString() measurement_type?: string;
  @IsOptional() @IsNumber() range_min?: number;
  @IsOptional() @IsNumber() range_max?: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() accuracy?: string;
  @IsOptional() @IsString() area_point_id?: string;
  @IsOptional() @IsString() external_certificate_file_id?: string;
}
