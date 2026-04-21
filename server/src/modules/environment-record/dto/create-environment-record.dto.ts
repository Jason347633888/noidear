import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateEnvironmentRecordDto {
  @IsString()
  location: string;

  @IsString()
  record_type: string; // 'temperature_humidity'|'pressure_differential'|'other'

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  humidity?: number;

  @IsOptional()
  @IsNumber()
  pressure_diff?: number;

  @IsBoolean()
  is_within_spec: boolean;

  @IsOptional()
  @IsString()
  abnormal_action?: string;

  @IsOptional()
  @IsString()
  production_batch_id?: string;
}
