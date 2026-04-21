import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  Min,
} from 'class-validator';

export class CreateProcessStepDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsString()
  recipe_id?: string;

  @IsInt()
  @Min(1)
  step_no: number;

  @IsNotEmpty()
  @IsString()
  step_name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  is_ccp: boolean;

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
