import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInspectionRecordItemDto {
  @IsOptional()
  @IsString()
  inspectionItemId?: string;

  @IsString()
  @IsNotEmpty()
  itemName: string;

  @IsOptional()
  @IsString()
  actualValue?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  textResult?: string;

  @IsIn(['pass', 'fail', 'conditional'])
  judgment: string;

  @IsOptional()
  standardSnapshot?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  evidenceFileId?: string;
}

export class CreateInspectionRecordDto {
  // Populated by controller from DEFAULT_COMPANY_ID
  company_id: string;

  @IsOptional()
  @IsString()
  inspectionStandardId?: string;

  @IsString()
  @IsNotEmpty()
  objectType: string;

  @IsString()
  @IsNotEmpty()
  objectId: string;

  @IsDateString()
  inspectedAt: string;

  @IsOptional()
  @IsString()
  inspectorId?: string;

  @IsOptional()
  @IsString()
  sourceTaskId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInspectionRecordItemDto)
  items: CreateInspectionRecordItemDto[];
}
