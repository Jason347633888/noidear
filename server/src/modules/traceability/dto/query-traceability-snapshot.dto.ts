import { IsString } from 'class-validator';

export class QueryTraceabilitySnapshotDto {
  @IsString()
  snapshotId!: string;
}
