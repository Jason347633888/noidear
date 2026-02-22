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
}
