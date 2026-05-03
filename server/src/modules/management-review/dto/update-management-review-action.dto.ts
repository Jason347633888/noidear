import { IsOptional, IsString } from 'class-validator';

export class UpdateManagementReviewActionDto {
  @IsOptional()
  @IsString()
  status?: 'open' | 'in_progress' | 'completed' | 'cancelled';

  @IsOptional()
  @IsString()
  verificationNote?: string;
}
