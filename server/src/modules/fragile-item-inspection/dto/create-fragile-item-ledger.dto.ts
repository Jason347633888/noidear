import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const FRAGILE_ITEM_RESULTS = ['intact', 'broken', 'missing'] as const;
export type FragileItemResult = (typeof FRAGILE_ITEM_RESULTS)[number];

export class CreateFragileItemLedgerDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  material_type: string;

  @IsString()
  @IsNotEmpty()
  area_point_id: string;

  @IsOptional()
  @IsString()
  location_desc?: string;

  @IsString()
  @IsNotEmpty()
  risk_level: string;

  @IsOptional()
  @IsString()
  risk_assessment_id?: string;
}

export class CreateFragileItemUsageReturnDto {
  @IsString()
  @IsNotEmpty()
  fragile_item_id: string;

  @IsOptional()
  @IsString()
  used_by?: string;

  @IsDateString()
  used_at: string;

  @IsOptional()
  @IsDateString()
  returned_at?: string;

  @IsOptional()
  @IsString()
  return_condition?: string;

  @IsIn(FRAGILE_ITEM_RESULTS)
  result: FragileItemResult;

  @IsOptional()
  @IsString()
  evidence_file_id?: string;
}
