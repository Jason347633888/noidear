import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTraceabilityActionDto {
  @IsEnum(['deviation', 'complaint', 'recallAssessment', 'traceabilityDrill', 'capa'] as const)
  actionType!: 'deviation' | 'complaint' | 'recallAssessment' | 'traceabilityDrill' | 'capa';

  @IsString()
  sourceQueryRef!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceNodeIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceRiskIds?: string[];

  @IsOptional()
  @IsString()
  note?: string;
}
