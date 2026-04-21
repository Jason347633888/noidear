import { IsString, IsOptional } from 'class-validator';

export class CreateCalibrationDto {
  @IsString() measuring_equipment_id: string;
  @IsString() calibrated_at: string; // ISO date string
  @IsString() valid_until: string; // ISO date string
  @IsString() result: string; // 'pass'|'fail'|'conditional'
  @IsOptional() @IsString() calibration_body?: string;
  @IsOptional() @IsString() certificate_no?: string;
  @IsOptional() @IsString() notes?: string;
}
