import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateManagementReviewDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  reviewDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  materialDueDate?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsArray()
  scope?: string[];

  @IsOptional()
  @IsArray()
  participants?: Record<string, unknown>[];
}
