import { IsOptional, IsInt, IsString, IsArray, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ExportDocumentsDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  level?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

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
