import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class TemplateToleranceRuleDto {
  @IsString()
  fieldKey!: string;

  @IsIn(['number', 'date', 'time'])
  valueType!: 'number' | 'date' | 'time';

  @IsIn(['between', 'min', 'max', 'equals'])
  operator!: 'between' | 'min' | 'max' | 'equals';

  @IsNumber()
  @IsOptional()
  min?: number;

  @IsNumber()
  @IsOptional()
  max?: number;

  @IsString()
  @IsOptional()
  unit?: string;
}

export class UpdateToleranceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateToleranceRuleDto)
  rules!: TemplateToleranceRuleDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
