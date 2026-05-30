import { IsString, IsOptional, IsBoolean, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateEnvironmentRecordDto {
  @IsOptional()
  @IsString()
  production_batch_id?: string;

  @IsOptional()
  @IsString()
  location_id?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsString()
  record_type: string; // 'temperature_humidity'|'pressure_differential'|'fridge_temperature'|'other'

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
}
