import { PartialType } from '@nestjs/swagger';
import { CreateRecordDto } from './create-record.dto';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRecordDto extends PartialType(CreateRecordDto) {
  @ApiProperty({ description: '修改原因（已审批记录必填）', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
