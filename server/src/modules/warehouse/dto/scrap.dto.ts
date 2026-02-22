import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScrapItemDto {
  @ApiProperty({ description: '物料批次ID' })
  @IsString()
  materialBatchId: string;

  @ApiProperty({ description: '报废数量', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  quantity: number;
}

export class CreateScrapDto {
  @ApiProperty({ description: '报废明细', type: [CreateScrapItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScrapItemDto)
  items: CreateScrapItemDto[];

  @ApiProperty({ description: '报废原因（必填）' })
  @IsString()
  reason: string;

  @ApiProperty({ description: '申请人ID' })
  @IsString()
  requesterId: string;
}

export class ApproveScrapDto {
  @ApiProperty({ description: '审批人ID' })
  @IsString()
  approvedBy: string;
}
