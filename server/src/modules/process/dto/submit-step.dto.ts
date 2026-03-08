import { IsInt, IsObject, IsBoolean, IsOptional, IsIn, IsString, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitStepDto {
  @ApiProperty({ description: '步骤编号（1-9）', minimum: 1, maximum: 9 })
  @IsInt()
  @Min(1)
  @Max(9)
  stepNumber: number;

  @ApiProperty({ description: '步骤数据' })
  @IsObject()
  data: Record<string, unknown>;

  @ApiPropertyOptional({ description: '是否保存为草稿', default: false })
  @IsBoolean()
  @IsOptional()
  saveAsDraft?: boolean;
}

export class ApproveStepDto {
  @ApiProperty({ description: '步骤编号（7 或 8）', enum: [7, 8] })
  @IsInt()
  @IsIn([7, 8])
  stepNumber: number;

  @ApiProperty({ description: '审批动作', enum: ['approve', 'reject'] })
  @IsString()
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiPropertyOptional({ description: '审批意见' })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class UpdateProductNameDto {
  @ApiProperty({ description: '产品名称' })
  @IsString()
  @IsNotEmpty()
  productName: string;
}
