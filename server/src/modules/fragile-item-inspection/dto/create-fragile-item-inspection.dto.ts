import { IsString, IsOptional, IsBoolean, IsInt, IsDateString } from 'class-validator';

export class CreateFragileItemInspectionDto {
  @IsOptional()
  @IsString()
  production_batch_id?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsString()
  item_name: string;

  @IsInt()
  total_qty: number;

  @IsInt()
  intact_qty: number;

  @IsBoolean()
  is_pass: boolean;

  @IsOptional()
  @IsString()
  damage_action?: string;

  @IsDateString()
  inspected_at: string;

  @IsOptional()
  @IsString()
  inspector_id?: string;
}
