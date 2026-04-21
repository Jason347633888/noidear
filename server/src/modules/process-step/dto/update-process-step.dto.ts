import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateProcessStepDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsString()
  recipe_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  step_no?: number;

  @IsOptional()
  @IsString()
  step_name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_ccp?: boolean;

  @IsOptional()
  @IsString()
  control_measures?: string;

  @IsOptional()
  @IsString()
  critical_limit?: string;

  @IsOptional()
  @IsString()
  monitoring_method?: string;

  @IsOptional()
  @IsString()
  monitoring_frequency?: string;

  @IsOptional()
  @IsString()
  corrective_action?: string;

  @IsOptional()
  @IsString()
  responsible_person?: string;
}
