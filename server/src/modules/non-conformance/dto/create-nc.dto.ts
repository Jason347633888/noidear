import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateNcDto {
  @IsString() source_type: string; // 'material_batch'|'production_batch'|'product'
  @IsString() source_id: string;
  @IsString() description: string;
  @IsOptional() @IsString() nc_type?: string;
  @IsOptional() @IsNumber() qty?: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() disposition?: string;
}

export class DisposeNcDto {
  @IsString() disposition: string; // 'rework'|'destroy'|'concession'|'return'
}
