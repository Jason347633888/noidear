import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCleaningRecordDto {
  @IsString() target_type: string; // 'area'|'equipment'|'utensil'|'facility'
  @IsString() target_name: string;
  @IsOptional() @IsString() cleaning_method?: string;
  @IsOptional() @IsString() disinfectant?: string;
  @IsBoolean() is_pass: boolean;
  @IsOptional() @IsString() notes?: string;
}
