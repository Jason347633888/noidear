import { IsOptional, IsIn, IsDateString } from 'class-validator';

export class ApprovalStatsQueryDto {
  @IsOptional()
  approverId?: string;

  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: 'pending' | 'approved' | 'rejected';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
