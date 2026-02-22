import { IsString, IsArray, ValidateNested, IsNumber, Min, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * P1-18: 领料单 DTO
 */

export class CreateRequisitionItemDto {
  @ApiProperty({ description: '物料批次ID' })
  @IsString()
  batchId: string;

  @ApiProperty({ description: '领料数量', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  quantity: number;
}

export class CreateRequisitionDto {
  @ApiProperty({
    description: '领料类型',
    enum: ['production', 'maintenance', 'other'],
  })
  @IsEnum(['production', 'maintenance', 'other'], {
    message: '领料类型必须为 production、maintenance 或 other',
  })
  requisitionType: string;

  @ApiProperty({ description: '领料明细', type: [CreateRequisitionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequisitionItemDto)
  items: CreateRequisitionItemDto[];

  @ApiPropertyOptional({ description: '部门ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class ApproveRequisitionDto {
  @ApiProperty({ description: '审批人ID' })
  @IsString()
  approvedBy: string;
}

export class QueryRequisitionDto {
  @ApiPropertyOptional({ description: '状态筛选' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '领料类型' })
  @IsOptional()
  @IsString()
  requisitionType?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
