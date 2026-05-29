import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
  ValidateNested,
  ValidateIf,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecommendMaterialBatchDto {
  @IsString()
  @IsNotEmpty()
  areaId!: string;

  @IsString()
  @IsNotEmpty()
  materialId!: string;

  @IsNumber()
  @Min(0.000001)
  requiredQuantity!: number;
}

export class MixingLineInputDto {
  @IsString()
  @IsNotEmpty()
  recipeLineId!: string;

  @IsString()
  @IsNotEmpty()
  materialBatchId!: string;

  @IsNumber()
  @Min(0.000001)
  actualQuantity!: number;

  @IsBoolean()
  manualOverride!: boolean;

  @ValidateIf((o) => o.manualOverride === true)
  @IsString()
  @IsNotEmpty()
  overrideReason?: string;
}

export class ListMixingExecutionsDto {
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() recipeId?: string;
  @IsOptional() @IsString() areaId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() shiftTypeId?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}

export class CreateMixingExecutionDto {
  @IsString()
  @IsNotEmpty()
  recipeId!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  areaId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  shiftTypeId?: string;

  @IsDateString()
  workDate!: string;

  @IsNumber()
  @Min(0.000001)
  actualWeight!: number;

  @IsOptional()
  @IsString()
  productionBatchId?: string;

  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MixingLineInputDto)
  lines!: MixingLineInputDto[];
}
