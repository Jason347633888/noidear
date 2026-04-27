import { IsString, IsNotEmpty, IsObject, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecordDto {
  @ApiProperty({ description: '模板ID', example: 'clxxxxxxxxxxxxx' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: '记录数据JSON', example: { field1: 'value1', field2: 'value2' } })
  @IsObject()
  @IsNotEmpty()
  dataJson: object;

  @ApiPropertyOptional({ description: '是否为离线填报', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  offlineFilled?: boolean;

  @ApiPropertyOptional({ description: '填写用途', enum: ['initial', 'change', 'periodic'] })
  @IsOptional()
  @IsString()
  usageType?: string;

  @ApiPropertyOptional({ description: '来源对象类型', example: 'change_event' })
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional({ description: '来源对象ID', example: 'clxxxxxxxxxxxxx' })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional({ description: '关联变更事件ID', example: 'clxxxxxxxxxxxxx' })
  @IsOptional()
  @IsString()
  changeEventId?: string;
}
