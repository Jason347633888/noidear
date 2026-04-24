import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateTraceabilityLinkageDto {
  @IsIn(['deviation', 'complaint', 'recallAssessment', 'traceabilityDrill', 'capa'])
  actionType!: 'deviation' | 'complaint' | 'recallAssessment' | 'traceabilityDrill' | 'capa';

  @IsString()
  sourceQueryHash!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
