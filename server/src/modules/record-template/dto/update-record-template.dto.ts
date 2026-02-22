import { IsString, IsOptional, IsInt, Min, IsObject, IsBoolean, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRecordTemplateDto {
  @ApiPropertyOptional({ description: '模板名称', example: '生产记录模板' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: '字段配置 JSON',
    example: {
      fields: [
        { name: 'productName', type: 'text', required: true, label: '产品名称' },
      ],
    },
  })
  @IsOptional()
  @IsObject()
  fieldsJson?: any;

  @ApiPropertyOptional({ description: '保留年限', example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  retentionYears?: number;

  @ApiPropertyOptional({ description: '模板描述', example: '生产部门记录模板' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否启用批次关联', example: false })
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
}
