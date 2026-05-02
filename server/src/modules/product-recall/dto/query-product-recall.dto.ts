import { IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryProductRecallDto {
  @IsOptional()
  @IsEnum(['draft', 'pending_review', 'approved', 'notified', 'in_progress', 'completed', 'rejected', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  risk_level?: string;

  @IsOptional()
  @IsString()
  production_batch_id?: string;

  @IsOptional()
  @IsString()
  source_complaint_id?: string;
}
