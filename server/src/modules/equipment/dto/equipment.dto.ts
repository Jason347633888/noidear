import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEquipmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsDateString()
  @IsOptional()
  activationDate?: string;

  @IsDateString()
  @IsOptional()
  warrantyExpiry?: string;

  @IsString()
  @IsOptional()
  responsiblePerson?: string;

  @IsObject()
  @IsOptional()
  maintenanceConfig?: Record<string, any>;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateEquipmentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsDateString()
  @IsOptional()
  activationDate?: string;

  @IsDateString()
  @IsOptional()
  warrantyExpiry?: string;

  @IsString()
  @IsOptional()
  responsiblePerson?: string;

  @IsObject()
  @IsOptional()
  maintenanceConfig?: Record<string, any>;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateEquipmentStatusDto {
  @IsEnum(['active', 'inactive', 'scrapped'])
  @IsNotEmpty()
  status: 'active' | 'inactive' | 'scrapped';
}

export class QueryEquipmentDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  responsiblePerson?: string;

  @IsString()
  @IsOptional()
  location?: string;
}
