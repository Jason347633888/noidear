import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * 检查部门资源访问权限 DTO
 */
export class CheckDepartmentAccessDto {
  @ApiProperty({
    description: '用户 ID',
    example: 'user_001',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: '目标部门 ID',
    example: 'dept_001',
  })
  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty({
    description: '操作类型',
    example: 'view',
    enum: ['view', 'edit', 'delete', 'create'],
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({
    description: '资源类型',
    example: 'document',
    enum: ['document', 'record', 'task'],
  })
  @IsString()
  @IsNotEmpty()
  resourceType: string;
}

/**
 * 查询可访问部门列表 DTO
 */
export class QueryAccessibleDepartmentsDto {
  @ApiProperty({
    description: '用户 ID',
    example: 'user_001',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: '资源类型（默认为 document）',
    example: 'document',
    enum: ['document', 'record', 'task'],
  })
  @IsString()
  @IsOptional()
  resourceType?: string;
}
