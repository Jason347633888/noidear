import { IsString, IsEnum, IsOptional, MinLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditFindingDto {
  @ApiProperty({ description: 'Audit plan ID', example: 'plan-123' })
  @IsUUID()
  planId: string;

  @ApiProperty({ description: 'Document ID being audited', example: 'doc-456' })
  @IsUUID()
  documentId: string;

  @ApiProperty({
    description: 'Audit result',
    enum: ['符合', '不符合'],
    example: '符合',
  })
  @IsEnum(['符合', '不符合'])
  auditResult: string;

  @ApiPropertyOptional({
    description: 'Issue type (required if auditResult = "不符合")',
    enum: ['需要修改', '缺失记录', '文档缺失'],
  })
  @IsOptional()
  @IsEnum(['需要修改', '缺失记录', '文档缺失'])
  issueType?: string;

  @ApiPropertyOptional({
    description: 'Issue description (required if auditResult = "不符合", min 10 chars)',
    minLength: 10,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @ApiPropertyOptional({
    description: 'Responsible department (required if auditResult = "不符合")',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Responsible person ID (required if auditResult = "不符合")',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
