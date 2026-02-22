import { IsOptional, IsString, IsArray, IsDateString } from 'class-validator';

export class ExportTaskRecordsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taskRecordIds?: string[];

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  status?: string;

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
