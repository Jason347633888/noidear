import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';

export enum StagingStocktakeKind {
  shift_start = 'shift_start',
  shift_end = 'shift_end',
  handover = 'handover',
}

export class StageMaterialToAreaDto {
  @IsString() @IsNotEmpty() batchId!: string;
  @IsString() @IsNotEmpty() areaId!: string;
  @IsNumber() @Min(0.000001) quantity!: number;
  @IsOptional() @IsString() operatorId?: string;
}

export class ConfirmStocktakeDto {
  @IsString() @IsNotEmpty() areaId!: string;
  @IsString() @IsNotEmpty() batchId!: string;
  @IsEnum(StagingStocktakeKind) kind!: StagingStocktakeKind;
  @IsDateString() workDate!: string;
  @IsString() @IsNotEmpty() shiftTypeId!: string;
  @IsNumber() actualQuantity!: number;
  @IsOptional() @IsString() teamId?: string;
  @IsOptional() @IsString() note?: string;
}

export class ListStockDto {
  @IsOptional() @IsString() areaId?: string;
  @IsOptional() @IsString() materialId?: string;
}
