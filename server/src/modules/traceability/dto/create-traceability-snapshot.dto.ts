import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTraceabilitySnapshotDto {
  @IsString()
  sourceQueryRef!: string;

  @IsEnum(['query', 'balance', 'export'] as const)
  snapshotType!: 'query' | 'balance' | 'export';

  @IsOptional()
  @IsString()
  retentionPolicy?: string;
}
