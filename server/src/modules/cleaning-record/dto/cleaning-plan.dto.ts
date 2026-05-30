import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsDateString, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CleaningPlanTemplateItemDto {
  @IsString() target_name: string;
  @IsString() target_type: string;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsBoolean() requires_disinfection?: boolean;
  @IsOptional() @IsString() disinfectant?: string;
  @IsOptional() @IsNumber() target_concentration?: number;
  @IsOptional() @IsString() normal_range?: string;
  @IsOptional() @IsBoolean() is_mandatory?: boolean;
  @IsOptional() @IsBoolean() requires_verification?: boolean;
  @IsOptional() @IsNumber() sequence?: number;
}

export class CreateCleaningPlanTemplateDto {
  @IsString() name: string;
  @IsString() area_type: string;
  @IsString() version: string;
  @IsOptional() @IsDateString() effective_from?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CleaningPlanTemplateItemDto)
  items: CleaningPlanTemplateItemDto[];
}

export class CloneTemplateToPlanDto {
  @IsString() template_id: string;
  @IsString() area_point_id: string;
  @IsString() version: string;
  @IsDateString() effective_from: string;
  @IsOptional() @IsString() frequency?: string;
}
