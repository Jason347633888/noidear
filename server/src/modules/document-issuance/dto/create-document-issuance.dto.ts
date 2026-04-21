import { IsString, IsOptional, IsInt, Min, IsDateString } from 'class-validator';

export class CreateDocumentIssuanceDto {
  @IsString()
  document_name: string;

  @IsOptional()
  @IsString()
  document_code?: string;

  @IsOptional()
  @IsString()
  template_id?: string;

  @IsOptional()
  @IsString()
  issued_to?: string;

  @IsOptional()
  @IsString()
  issued_by?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsDateString()
  issued_at?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
