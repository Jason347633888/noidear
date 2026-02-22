import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class RollbackTaskDto {
  @ApiProperty({ description: '回退到的步骤索引（不填则回退到上一步）', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  targetStepIndex?: number;

  @ApiProperty({ description: '回退原因', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
