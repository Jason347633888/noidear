import { IsString, IsOptional, IsNumber, IsNotEmpty, IsIn, IsPositive } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  spec?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  net_weight?: number;

  @IsOptional()
  @IsString()
  weight_unit?: string;

  @IsOptional()
  @IsString()
  label_claims?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'discontinued'])
  status?: string;
}
