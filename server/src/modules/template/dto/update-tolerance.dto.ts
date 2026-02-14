import { IsIn, IsNumber, IsOptional, IsNotEmpty, Min, Max, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ToleranceConfigItemDto {
  @ApiProperty({ description: '公差类型', enum: ['range', 'percentage'] })
  @IsIn(['range', 'percentage'], { message: '公差类型必须是 range 或 percentage' })
  @IsNotEmpty()
  type: 'range' | 'percentage';

  @ApiPropertyOptional({ description: '最小值 (range 类型)', minimum: 0 })
  @IsNumber()
  @Min(0, { message: '最小值不能为负数' })
  @IsOptional()
  min?: number;

  @ApiPropertyOptional({ description: '最大值 (range 类型)', minimum: 0 })
  @IsNumber()
  @Min(0, { message: '最大值不能为负数' })
  @IsOptional()
  max?: number;

  @ApiPropertyOptional({ description: '百分比 (percentage 类型)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0, { message: '百分比不能为负数' })
  @Max(100, { message: '百分比不能超过 100' })
  @IsOptional()
  percentage?: number;
}

export class UpdateToleranceDto {
  @ApiProperty({
    description: '公差配置映射（字段名 -> 配置）',
    example: { temp: { type: 'range', min: 175, max: 185 } },
  })
  @IsObject()
  @IsNotEmpty({ message: '公差配置不能为空' })
  config: Record<string, ToleranceConfigItemDto>;
}
