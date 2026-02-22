import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsObject, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecordTemplateDto {
  @ApiProperty({ description: '模板编号', example: 'TEMP_001' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: '模板名称', example: '生产记录模板' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '字段配置 JSON',
    example: {
      fields: [
        { name: 'productName', type: 'text', required: true, label: '产品名称' },
        { name: 'quantity', type: 'number', required: true, label: '数量' },
      ],
    },
  })
  @IsObject()
  fieldsJson: any;

  @ApiPropertyOptional({ description: '保留年限', example: 3, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  retentionYears?: number;

  @ApiPropertyOptional({ description: '模板描述', example: '生产部门记录模板' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否启用批次关联', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  batchLinkEnabled?: boolean;

  @ApiPropertyOptional({ description: '批次关联类型', example: 'production', enum: ['production', 'finished_goods'] })
  @IsOptional()
  @IsString()
  @IsIn(['production', 'finished_goods'])
  batchLinkType?: string;

  @ApiPropertyOptional({ description: '批次关联字段名', example: 'batchNumber' })
  @IsOptional()
  @IsString()
  batchLinkField?: string;

  @ApiPropertyOptional({ description: '是否需要审批', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean;

  @ApiPropertyOptional({
    description: '工作流配置 JSON（approvalRequired 为 true 时需填写）',
    example: { templateId: 'wf_tpl_001' },
  })
  @IsOptional()
  @IsObject()
  workflowConfig?: Record<string, any>;
}
