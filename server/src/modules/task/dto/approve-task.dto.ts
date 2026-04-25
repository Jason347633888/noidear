import { IsIn, IsOptional, IsString } from 'class-validator';

export class ApproveTaskDto {
  @IsString()
  recordId!: string;

  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  comment?: string;
}
