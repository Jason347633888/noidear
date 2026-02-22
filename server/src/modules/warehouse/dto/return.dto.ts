import { IsString, IsArray, ValidateNested, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReturnItemDto {
  @ApiProperty({ description: '物料批次ID' })
  @IsString()
  materialBatchId: string;

  @ApiProperty({ description: '退料数量', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  quantity: number;
}

export class CreateReturnDto {
  @ApiProperty({ description: '退料明细', type: [CreateReturnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReturnItemDto)
  items: CreateReturnItemDto[];

  @ApiProperty({ description: '退料原因', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: '申请人ID' })
  @IsString()
  requesterId: string;
}

export class ApproveReturnDto {
  @ApiProperty({ description: '审批人ID' })
  @IsString()
  approvedBy: string;
}
