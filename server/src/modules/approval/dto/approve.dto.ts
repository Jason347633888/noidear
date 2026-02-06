import { IsString, IsNotEmpty, IsIn, IsOptional, MinLength, MaxLength } from 'class-validator';

export class ApproveDto {
  @IsString()
  @IsNotEmpty()
  approvalId: string;

  @IsString()
  @IsIn(['approved', 'rejected'])
  action: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: '审批意见不能超过500个字符' })
  comment?: string;

  @IsString()
  @IsOptional()
  @MinLength(10, { message: '驳回原因至少10个字符' })
  @MaxLength(500, { message: '驳回原因不能超过500个字符' })
  rejectionReason?: string;
}
