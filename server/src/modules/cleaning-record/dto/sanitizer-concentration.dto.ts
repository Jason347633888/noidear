import { IsArray, IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export const JUDGMENT_VALUES = ['pass', 'fail'] as const;
export type JudgmentValue = (typeof JUDGMENT_VALUES)[number];

export class CreateSanitizerConcentrationCheckDto {
  @IsString()
  @IsNotEmpty()
  area_point_id: string;

  @IsString()
  @IsNotEmpty()
  disinfectant_type: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  target_concentration?: number;

  @IsNumber()
  @Min(0)
  actual_concentration: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsIn(JUDGMENT_VALUES)
  judgment: JudgmentValue;

  @IsDateString()
  checked_at: string;

  @IsOptional()
  @IsString()
  operator_id?: string;

  @IsOptional()
  @IsString()
  verifier_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appeared_in_source_forms?: string[];

  @IsOptional()
  @IsString()
  source_form_version?: string;

  @IsOptional()
  @IsString()
  source_form_field_group?: string;
}
