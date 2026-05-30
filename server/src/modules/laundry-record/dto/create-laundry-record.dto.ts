import { IsArray, IsDateString, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLaundryWorkRecordItemDto {
  @IsString()
  garment_type: string;

  @IsOptional()
  @IsString()
  garment_inventory_id?: string;

  @IsOptional()
  @IsString()
  area_id?: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  action: string;

  @IsString()
  result: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  evidence_file_id?: string;
}

export class CreateLaundryWorkRecordDto {
  @IsString()
  company_id: string;

  @IsDateString()
  work_date: string | Date;

  @IsOptional()
  @IsString()
  shift_type_id?: string;

  @IsOptional()
  @IsString()
  batch_no?: string;

  @IsOptional()
  @IsString()
  washing_method?: string;

  @IsOptional()
  @IsString()
  disinfection_method?: string;

  @IsOptional()
  @IsString()
  disinfectant?: string;

  @IsOptional()
  temperature?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration_min?: number;

  @IsString()
  operator_id: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLaundryWorkRecordItemDto)
  items: CreateLaundryWorkRecordItemDto[];
}

export type CreateLaundryWorkRecordInput = {
  company_id: string;
  work_date: Date;
  shift_type_id?: string;
  batch_no?: string;
  washing_method?: string;
  disinfection_method?: string;
  disinfectant?: string;
  temperature?: number;
  duration_min?: number;
  operator_id: string;
  notes?: string;
  items: {
    garment_type: string;
    garment_inventory_id?: string;
    area_id?: string;
    quantity: number;
    action: string;
    result: string;
    notes?: string;
    evidence_file_id?: string;
  }[];
};
