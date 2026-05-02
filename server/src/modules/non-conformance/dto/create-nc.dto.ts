import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export const NC_SOURCE_TYPES = ['material_batch', 'production_batch', 'product'] as const;
export type NcSourceType = (typeof NC_SOURCE_TYPES)[number];

export class CreateNcDto {
  @IsIn(NC_SOURCE_TYPES)
  source_type: NcSourceType;

  @IsString()
  @IsNotEmpty()
  source_id: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  nc_type?: string;

  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  disposition?: string;
}

export class DisposeNcDto {
  @IsString()
  disposition: string; // 'rework'|'destroy'|'concession'|'return'
}
