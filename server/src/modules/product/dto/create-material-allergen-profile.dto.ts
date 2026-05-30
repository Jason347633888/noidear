import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaterialAllergenProfileDto {
  @IsString()
  @IsNotEmpty()
  material_id: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  supplier_id?: string;

  @IsString()
  @IsNotEmpty()
  allergen_code: string;

  @IsString()
  @IsNotEmpty()
  allergen_name: string;

  @IsBoolean()
  contains_allergen: boolean;

  @IsOptional()
  @IsString()
  cross_contact_risk?: string;

  @IsOptional()
  @IsString()
  evidence_file_id?: string;

  @IsDateString()
  @Type(() => Date)
  effective_from: Date;

  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  effective_to?: Date;
}
