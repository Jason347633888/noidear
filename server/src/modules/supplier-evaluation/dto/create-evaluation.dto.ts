import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateEvaluationDto {
  @IsString() supplier_id: string;
  @IsString() eval_period: string; // 如 '2026-Q1'
  @IsOptional() @IsNumber() quality_score?: number;
  @IsOptional() @IsNumber() delivery_score?: number;
  @IsOptional() @IsNumber() service_score?: number;
  @IsString() verdict: string; // 'approved'|'conditional'|'eliminated'
  @IsOptional() @IsString() notes?: string;
}
