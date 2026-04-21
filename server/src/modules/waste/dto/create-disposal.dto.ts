import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateDisposalDto {
  @IsString() material_name: string;
  @IsOptional() @IsString() lot_no?: string;
  @IsString() disposal_reason: string;
  @IsNumber() qty: number;
  @IsString() unit: string;
  @IsString() disposal_method: string;
  @IsString() disposal_date: string;
  @IsOptional() @IsString() operator_id?: string;
  @IsOptional() @IsString() witness_id?: string;
  @IsOptional() @IsString() notes?: string;
}
