import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// Nested payload DTOs
//
// 这些 DTO 仅用于 controller 层 (ValidationPipe) 的请求结构校验，
// 与 service 内部的 ProductProcessChangePayload (运行时校验的真实形状)
// 解耦：service 层仍是唯一的运行时校验来源。
// ---------------------------------------------------------------------------

export class RecipeLinePayloadDto {
  @IsString()
  @IsNotEmpty()
  material_id!: string;

  // qty_per_batch 既允许 number 也允许 numeric string，由 service 层做最终校验。
  @IsNotEmpty()
  qty_per_batch!: number | string;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsString()
  @IsNotEmpty()
  area_id!: string;

  @IsOptional()
  @IsBoolean()
  is_critical?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ProcessStepPayloadDto {
  @IsInt()
  @Min(1)
  step_no!: number;

  @IsOptional()
  @IsString()
  step_name?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_ccp?: boolean;
}

export class CcpPointPayloadDto {
  @IsInt()
  @Min(1)
  step_no!: number;

  @IsString()
  @IsNotEmpty()
  ccp_no!: string;

  @IsIn(['biological', 'chemical', 'physical'])
  hazard_type!: string;

  @IsString()
  @IsNotEmpty()
  control_measure!: string;

  @IsString()
  @IsNotEmpty()
  critical_limit!: string;

  @IsOptional()
  cl_min?: number | string | null;

  @IsOptional()
  cl_max?: number | string | null;

  @IsOptional()
  @IsString()
  cl_unit?: string;

  @IsOptional()
  @IsString()
  monitoring_method?: string;

  @IsOptional()
  @IsString()
  monitoring_frequency?: string;

  @IsOptional()
  @IsString()
  corrective_action?: string;
}

export class ProductProcessChangePayloadDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeLinePayloadDto)
  recipeLines?: RecipeLinePayloadDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProcessStepPayloadDto)
  processSteps?: ProcessStepPayloadDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CcpPointPayloadDto)
  ccpPoints?: CcpPointPayloadDto[];

  @IsOptional()
  @IsString()
  baseRecipeId?: string;

  @IsOptional()
  @IsInt()
  baseRecipeVersion?: number;

  @IsOptional()
  @IsString()
  versionNote?: string;
}

// ---------------------------------------------------------------------------
// Body DTOs
// ---------------------------------------------------------------------------
//
// NOTE: 嵌套校验依赖全局 ValidationPipe 启用 `transform: true`（已在
// `server/src/main.ts` 配置）。如果未来全局 pipe 配置发生变化，需要确保
// 仍然保留 transform/whitelist，否则 @ValidateNested + @Type 不会生效。

export class CreateProductProcessChangeDraftDto {
  @IsString()
  productId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes!: string[];

  @IsObject()
  @ValidateNested()
  @Type(() => ProductProcessChangePayloadDto)
  payloadJson!: ProductProcessChangePayloadDto;
}

export class CreateProductProcessChangeDraftBodyDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes!: string[];

  @IsObject()
  @ValidateNested()
  @Type(() => ProductProcessChangePayloadDto)
  payloadJson!: ProductProcessChangePayloadDto;
}
