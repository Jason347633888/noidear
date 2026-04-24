import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTraceabilityActionDto {
  @IsEnum(['deviation', 'complaint', 'recallAssessment', 'traceabilityDrill', 'capa'] as const)
  actionType!: 'deviation' | 'complaint' | 'recallAssessment' | 'traceabilityDrill' | 'capa';

  @IsString()
  sourceQueryRef!: string;

  @IsOptional()
  sourceNodeIds?: string[];

  @IsOptional()
  sourceRiskIds?: string[];

  @IsOptional()
  @IsString()
  note?: string;
}
