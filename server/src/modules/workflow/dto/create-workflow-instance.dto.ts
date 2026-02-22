import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkflowInstanceDto {
  @ApiProperty({
    description: '工作流模板 ID',
    example: 'tpl_001',
  })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({
    description: '资源类型',
    example: 'document',
    enum: ['document', 'task', 'record'],
  })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @ApiProperty({
    description: '资源 ID',
    example: 'doc_001',
  })
  @IsString()
  @IsNotEmpty()
  resourceId: string;

  @ApiProperty({
    description: '资源标题',
    example: '生产工艺文件 v1.0',
  })
  @IsString()
  @IsNotEmpty()
  resourceTitle: string;
}
