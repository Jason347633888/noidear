import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ApprovalTaskActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class RejectApprovalTaskDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  comment!: string;
}

export class TransferApprovalTaskDto {
  @IsString()
  targetUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
