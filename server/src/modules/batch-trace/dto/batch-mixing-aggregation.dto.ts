import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayNotEmpty } from 'class-validator';

export class CreateBatchMixingAggregationDto {
  @IsString()
  @IsNotEmpty()
  productionBatchId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  mixingExecutionIds!: string[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class ConfirmBatchMixingAggregationDto {
  @IsString()
  @IsNotEmpty()
  productionBatchId!: string;

  @IsString()
  @IsNotEmpty()
  confirmedBy!: string;
}
