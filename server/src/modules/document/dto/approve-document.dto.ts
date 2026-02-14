import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveDocumentDto {
  @ApiProperty({
    description: '审批状态',
    enum: ['approved', 'rejected'],
    example: 'approved',
  })
  @IsIn(['approved', 'rejected'], { message: '审批状态必须是 approved 或 rejected' })
  status: 'approved' | 'rejected';

  @ApiPropertyOptional({
    description: '审批意见',
    maxLength: 500,
    example: '文档格式规范，内容完整',
  })
  @IsString()
  @MaxLength(500, { message: '审批意见最多 500 个字符' })
  @IsOptional()
  comment?: string;
}
