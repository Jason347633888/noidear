import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTraceabilityExportDto {
  @IsEnum(['simple', 'fullPackage'] as const)
  exportMode!: 'simple' | 'fullPackage';

  @IsString()
  sourceQueryRef!: string;

  @IsOptional()
  @IsBoolean()
  includeEvidence?: boolean;

  @IsOptional()
  @IsBoolean()
  includeMaskedData?: boolean;
}
