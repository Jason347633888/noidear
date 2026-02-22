import { PartialType } from '@nestjs/swagger';
import { CreateRecordDto } from './create-record.dto';
import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRecordDto extends PartialType(CreateRecordDto) {
  @ApiPropertyOptional({ description: '修改原因（已审批记录必填）', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: '签名时间戳（审批通过时由系统写入）', required: false })
  @IsOptional()
  @IsDateString()
  signatureTimestamp?: string;
}
