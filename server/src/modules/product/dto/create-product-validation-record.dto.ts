import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProductValidationRecordDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  recipe_id?: string;

  @IsString()
  @IsNotEmpty()
  validation_type: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  inspection_record_id?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  change_event_id?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  evidence_file_id?: string;
}
