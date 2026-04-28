import { IsString, IsOptional, IsNumber, IsNotEmpty, IsIn, IsPositive } from 'class-validator';

export class CreateProductDto {
  @IsOptional()
  @IsString()
  code?: string;

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

  @IsOptional()
  @IsString()
  @IsIn(['rd_process', 'legacy_import', 'manual_admin'])
  source?: string;
}
