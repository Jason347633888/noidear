import { IsOptional, IsInt, IsIn, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class DocumentStatsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  @Type(() => Number)
  level?: 1 | 2 | 3;

  @IsOptional()
  departmentId?: string;

  @IsOptional()
  @IsIn(['draft', 'pending', 'approved', 'rejected', 'in_review', 'published'])
  status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'in_review' | 'published';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
