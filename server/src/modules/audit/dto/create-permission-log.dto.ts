import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsObject } from 'class-validator';
import type { PermissionValue } from './json-types';

export class CreatePermissionLogDto {
  @ApiProperty({ description: '操作人 ID' })
  @IsString()
  @IsNotEmpty()
  operatorId: string;

  @ApiProperty({ description: '操作人姓名' })
  @IsString()
  @IsNotEmpty()
  operatorName: string;

  @ApiProperty({ description: '目标用户 ID' })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;

  @ApiProperty({ description: '目标用户名' })
  @IsString()
  @IsNotEmpty()
  targetUsername: string;

  @ApiProperty({
    description: '操作类型',
    enum: ['assign_role', 'revoke_role', 'change_department'],
  })
  @IsString()
  @IsIn(['assign_role', 'revoke_role', 'change_department'])
  action: string;

  @ApiPropertyOptional({ description: '变更前值（Json 对象）' })
  @IsOptional()
  @IsObject() // HIGH-5: Json 字段验证
  beforeValue?: PermissionValue;

  @ApiPropertyOptional({ description: '变更后值（Json 对象）' })
  @IsOptional()
  @IsObject() // HIGH-5: Json 字段验证
  afterValue?: PermissionValue;

  @ApiPropertyOptional({ description: '变更原因' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: '批准人 ID' })
  @IsString()
  @IsOptional()
  approvedBy?: string;

  @ApiPropertyOptional({ description: '批准人姓名' })
  @IsString()
  @IsOptional()
  approvedByName?: string;

  @ApiProperty({ description: 'IP 地址' })
  @IsString()
  @IsNotEmpty()
  ipAddress: string;
}
