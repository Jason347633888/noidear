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

  @IsDateString()
  workDate!: string;

  @IsNumber()
  @Min(0.000001)
  actualWeight!: number;

  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MixingLineInputDto)
  lines!: MixingLineInputDto[];
}
