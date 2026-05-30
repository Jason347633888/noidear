import { IsString, IsOptional, IsBoolean, IsNumber, IsPositive, IsNotEmpty } from 'class-validator';

export class UpdateRecipeLineDto {
  /** Required: every recipe-line mutation must be tied to a change event */
  @IsString()
  @IsNotEmpty()
  changeEventId: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  qty_per_batch?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  unit?: string;

  @IsOptional()
  @IsBoolean()
  is_critical?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
