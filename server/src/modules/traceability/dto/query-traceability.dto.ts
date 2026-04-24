import { IsBoolean, IsDateString, IsEnum, IsObject, IsOptional, IsString, ValidateIf } from 'class-validator';

export class QueryTraceabilityDto {
  @IsEnum(['object', 'scenario'] as const)
  entryMode!: 'object' | 'scenario';

  @IsEnum(['forward', 'backward', 'bidirectional'] as const)
  traceMode!: 'forward' | 'backward' | 'bidirectional';

  @IsEnum(['ledger', 'graph'] as const)
  viewMode!: 'ledger' | 'graph';

  @IsEnum(['current', 'asOf'] as const)
  timeMode!: 'current' | 'asOf';

  @ValidateIf((o) => o.entryMode === 'object')
  @IsString()
  objectType?: string;

  @ValidateIf((o) => o.entryMode === 'object')
  @IsString()
  objectId?: string;

  @ValidateIf((o) => o.entryMode === 'scenario')
  @IsString()
  scenario?: string;

  @ValidateIf((o) => o.timeMode === 'asOf')
  @IsDateString()
  asOfAt?: string;

  @IsOptional()
  @IsString()
  departmentScope?: string;

  @IsOptional()
  @IsBoolean()
  includeEvidence?: boolean;

  @IsOptional()
  @IsBoolean()
  includeAuxiliaryNodes?: boolean;

  @IsOptional()
  @IsBoolean()
  includeRiskDetails?: boolean;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}
