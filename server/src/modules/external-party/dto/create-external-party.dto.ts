import { IsString, IsOptional, IsNotEmpty, IsIn } from 'class-validator';

export class CreateExternalPartyDto {
  @IsString()
  @IsIn(['customer', 'carrier', 'waste_collector'])
  party_type: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  contact_name?: string;

  @IsOptional()
  @IsString()
  contact_phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  license_no?: string;

  @IsOptional()
  @IsString()
  approved_items?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
