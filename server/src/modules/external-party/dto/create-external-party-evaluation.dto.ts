import { IsString, IsNotEmpty, IsIn, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExternalPartyEvaluationDto {
  @IsString()
  @IsNotEmpty()
  external_party_id: string;

  @IsString()
  @IsIn(['contractor_food_safety', 'logistics', 'outsourced_service', 'other'])
  evaluation_type: string;

  @IsDateString()
  evaluation_date: string | Date;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  score?: number;

  @IsString()
  @IsNotEmpty()
  result: string;

  @IsOptional()
  @IsString()
  risk_level?: string;

  @IsOptional()
  @IsString()
  evaluator_id?: string;

  @IsOptional()
  @IsString()
  evidence_file_id?: string;

  @IsOptional()
  @IsDateString()
  next_review_at?: string;
}
