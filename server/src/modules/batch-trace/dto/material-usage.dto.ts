import { IsNumber, IsPositive, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMaterialUsageDto {
  @ApiProperty({ description: '生产批次ID' })
  @IsString()
  @IsNotEmpty()
  productionBatchId: string;

  @ApiProperty({ description: '原料批次ID' })
  @IsString()
  @IsNotEmpty()
  materialBatchId: string;

  @ApiProperty({ description: '配方明细ID' })
  @IsString()
  @IsNotEmpty()
  recipeLineId: string;

  @ApiProperty({ description: '使用数量', minimum: 0.0001 })
  @IsNumber()
  @IsPositive()
  quantity: number;
}

export class QueryMaterialUsageDto {
  @ApiProperty({ description: '生产批次ID' })
  @IsString()
  @IsNotEmpty()
  productionBatchId: string;
}
