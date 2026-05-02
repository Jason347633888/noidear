import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateReworkRecordDto {
  @IsString()
  production_batch_id: string;

  @IsString()
  nc_id: string;

  @IsString()
  rework_reason: string;

  @IsNumber()
  rework_qty: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsString()
  rework_process?: string;

  @IsDateString()
  rework_date: string;

  @IsOptional()
  @IsString()
  operator_id?: string;

  @IsString()
  quality_verdict: string; // 'pass'|'fail'

  @IsOptional()
  @IsString()
  verdict_by?: string;
}
