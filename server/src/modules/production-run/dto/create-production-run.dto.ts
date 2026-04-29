import { IsNotEmpty, IsString, IsOptional, IsDateString, IsNumber, IsPositive } from 'class-validator';

export class CreateProductionRunDto {
  @IsNotEmpty() @IsString()
  shift_instance_id: string;

  @IsNotEmpty() @IsString()
  production_line: string;

  @IsNotEmpty() @IsString()
  product_id: string;

  @IsNotEmpty() @IsString()
  recipe_id: string;

  @IsOptional() @IsDateString()
  started_at?: string;

  @IsOptional() @IsString()
  notes?: string;
}

export class CloseProductionRunDto {
  @IsOptional() @IsNumber() @IsPositive()
  actual_yield?: number;

  @IsOptional() @IsString()
  yield_unit?: string;

  @IsOptional() @IsString()
  notes?: string;
}
