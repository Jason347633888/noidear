import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

export class CreateFoodSafetyCultureRecordDto {
  @IsString()
  activity_type: string; // training, inspection, meeting, campaign

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  participants?: number;

  @IsOptional()
  @IsDateString()
  conducted_at?: string;

  @IsOptional()
  @IsString()
  organizer_id?: string;

  @IsOptional()
  @IsString()
  result_summary?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
