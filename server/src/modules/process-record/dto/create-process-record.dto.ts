import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateProcessRecordDto {
  @IsString() production_batch_id: string;
  @IsString() param_name: string;
  @IsOptional() @IsNumber() param_value?: number;
  @IsOptional() @IsString() param_text?: string;
  @IsOptional() @IsString() unit?: string;
  @IsBoolean() is_within_spec: boolean;
  @IsOptional() @IsString() abnormal_action?: string;
}
