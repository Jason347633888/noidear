import { IsOptional, IsIn, IsDateString } from 'class-validator';

export class TaskStatsQueryDto {
  @IsOptional()
  departmentId?: string;

  @IsOptional()
  templateId?: string;

  @IsOptional()
  @IsIn(['pending', 'completed', 'cancelled'])
  status?: 'pending' | 'completed' | 'cancelled';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
