import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecordDto {
  @ApiProperty({ description: '模板ID', example: 'clxxxxxxxxxxxxx' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: '记录数据JSON', example: { field1: 'value1', field2: 'value2' } })
  @IsObject()
  @IsNotEmpty()
  dataJson: object;
}
