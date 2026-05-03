import { IsOptional, IsString } from 'class-validator';

export class CreateManagementReviewActionDto {
  @IsString()
  action!: string;

  @IsString()
  responsibleDepartment!: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}
