import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateManagementReviewActionDto {
  @IsOptional()
  @IsIn(['open', 'in_progress', 'completed', 'cancelled'])
  status?: 'open' | 'in_progress' | 'completed' | 'cancelled';

  @IsOptional()
  @IsString()
  verificationNote?: string;
}
