import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsObject } from 'class-validator';
import type { SensitiveDetails } from './json-types';

export class CreateSensitiveLogDto {
  @ApiProperty({ description: '用户 ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: '用户名' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: '操作类型',
    enum: [
      'delete_document',
      'export_data',
      'approve',
      'reject',
      'create_audit_plan',
      'update_audit_plan',
      'delete_audit_plan',
      'start_audit',
      'start_audit_plan',
      'complete_audit_plan',
      'copy_audit_plan',
      'create_audit_finding',
      'update_audit_finding',
      'submit_rectification',
      'verify_rectification',
      'reject_rectification',
    ],
  })
  @IsString()
  @IsIn([
    'delete_document',
    'export_data',
    'approve',
    'reject',
    'create_audit_plan',
    'update_audit_plan',
    'delete_audit_plan',
    'start_audit',
    'start_audit_plan',
    'complete_audit_plan',
    'copy_audit_plan',
    'create_audit_finding',
    'update_audit_finding',
    'submit_rectification',
    'verify_rectification',
    'reject_rectification',
  ])
  action: string;

  @ApiProperty({ description: '资源类型' })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @ApiProperty({ description: '资源 ID（必填）' })
  @IsString()
  @IsNotEmpty()
  resourceId: string;

  @ApiProperty({ description: '资源名称（必填）' })
  @IsString()
  @IsNotEmpty()
  resourceName: string;

  @ApiPropertyOptional({ description: '详细信息（Json 对象）' })
  @IsOptional()
  @IsObject() // HIGH-5: Json 字段验证
  details?: SensitiveDetails;

  @ApiProperty({ description: 'IP 地址（必填）' })
  @IsString()
  @IsNotEmpty()
  ipAddress: string;

  @ApiProperty({ description: 'User-Agent（必填）' })
  @IsString()
  @IsNotEmpty()
  userAgent: string;
}
