import { IsIn, IsString } from 'class-validator';

export class CreateTraceabilityExportDto {
  @IsIn(['simple', 'fullPackage'])
  exportMode!: 'simple' | 'fullPackage';

  @IsString()
  sourceQueryHash!: string;
}
