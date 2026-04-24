import { IsDateString, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

export class QueryTraceabilityDto {
  @IsEnum(['object', 'scenario'] as const)
  entryMode!: 'object' | 'scenario';

  @IsOptional()
  @IsString()
  objectType?: string;

  @IsOptional()
  @IsString()
  objectId?: string;

  @IsOptional()
  @IsString()
  scenario?: string;

  @IsIn(['forward', 'backward', 'bidirectional'])
  traceMode!: 'forward' | 'backward' | 'bidirectional';

  @IsIn(['ledger', 'graph'])
  viewMode!: 'ledger' | 'graph';

  @IsIn(['current', 'asOf'])
  timeMode!: 'current' | 'asOf';

  @IsOptional()
  @IsDateString()
  asOfAt?: string;
}
