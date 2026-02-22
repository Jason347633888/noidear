import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class QueryReportDto {
  @ApiPropertyOptional({
    description: 'Audit Plan ID to filter reports',
    example: 'plan-123',
  })
  @IsOptional()
  @IsUUID()
  planId?: string;
}
