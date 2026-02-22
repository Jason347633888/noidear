import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryTrainingPlanDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: '年度筛选' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ description: '状态筛选', enum: ['draft', 'pending_approval', 'approved', 'rejected'] })
  @IsString()
  @IsOptional()
  status?: string;
}
