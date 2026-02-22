import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSystemConfigDto {
  @ApiProperty({ description: '配置键' })
  @IsString()
  key: string;

  @ApiProperty({ description: '配置值' })
  @IsString()
  value: string;

  @ApiPropertyOptional({
    description: '值类型',
    enum: ['text', 'number', 'json', 'boolean'],
    default: 'text',
  })
  @IsOptional()
  @IsEnum(['text', 'number', 'json', 'boolean'])
  valueType?: string;

  @ApiProperty({ description: '配置分类（system, batch, notification）' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSystemConfigDto {
  @ApiPropertyOptional({ description: '配置值' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class QuerySystemConfigDto {
  @ApiPropertyOptional({ description: '分类筛选' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '关键字搜索' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
