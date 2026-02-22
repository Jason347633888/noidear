import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsInt } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  materialCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  specification?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  shelfLife?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  safetyStock?: number;

  @IsOptional()
  customFields?: any;
}

export class UpdateMaterialDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  specification?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  shelfLife?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  safetyStock?: number;

  @IsOptional()
  customFields?: any;

  @IsString()
  @IsOptional()
  status?: string;
}

export class QueryMaterialDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Min(1)
  limit?: number = 10;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
