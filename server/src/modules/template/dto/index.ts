import { IsInt, IsString, IsNotEmpty, IsOptional, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TemplateFieldDto {
  @ApiProperty({ description: '字段名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '字段标签' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: '字段类型', enum: ['text', 'textarea', 'number', 'date', 'select', 'boolean'] })
  @IsString()
  type: string;

  @ApiProperty({ description: '是否必填' })
  @IsString()
  required: boolean;

  @ApiPropertyOptional({ description: '选项列表', type: [Object] })
  @IsArray()
  @IsOptional()
  options?: { label: string; value: string | number }[];
}

export class CreateTemplateDto {
  @ApiProperty({ description: '模板级别', example: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  level: number;

  @ApiProperty({ description: '模板标题' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: '字段定义', type: [TemplateFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldDto)
  fields: TemplateFieldDto[];
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ description: '模板标题' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: '字段定义', type: [TemplateFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldDto)
  @IsOptional()
  fields?: TemplateFieldDto[];

  @ApiPropertyOptional({ description: '状态', enum: ['active', 'inactive'] })
  @IsString()
  @IsOptional()
  status?: string;
}

export class TemplateQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '模板级别' })
  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  level?: number;

  @ApiPropertyOptional({ description: '状态' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class ParseExcelDto {
  @ApiProperty({ description: 'Excel 文件', type: 'string', format: 'binary' })
  file: Express.Multer.File;
}

export class CopyTemplateDto {
  @ApiProperty({ description: '源模板 ID' })
  @IsString()
  @IsNotEmpty()
  templateId: string;
}
