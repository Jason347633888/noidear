import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class ExportRecordsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recordIds?: string[];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  usageType?: string;

  @IsOptional()
  @IsString()
  changeEventId?: string;

  @IsOptional()
  @IsString()
  submitterId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];
}
