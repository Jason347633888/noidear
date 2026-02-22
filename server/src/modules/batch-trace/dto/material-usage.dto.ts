import { IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMaterialUsageDto {
  @ApiProperty({ description: '生产批次ID' })
  @IsUUID()
  productionBatchId: string;

  @ApiProperty({ description: '原料批次ID' })
  @IsUUID()
  materialBatchId: string;

  @ApiProperty({ description: '使用数量', minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;
}

export class QueryMaterialUsageDto {
  @ApiProperty({ description: '生产批次ID' })
  @IsUUID()
  productionBatchId: string;
}
