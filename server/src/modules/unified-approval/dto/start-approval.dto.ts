import { IsOptional, IsString, MinLength } from 'class-validator';

export class StartApprovalDto {
  @IsString()
  resourceType!: string;

  @IsString()
  resourceId!: string;

  @IsOptional()
  @IsString()
  resourceStep?: string;

  @IsString()
  triggerKey!: string;

  @IsString()
  @MinLength(1)
  title!: string;
}
