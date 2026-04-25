import { IsObject, IsOptional, IsString } from 'class-validator';

export class LegacySubmitTaskDto {
  @IsString()
  taskId!: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  deviationReasons?: Record<string, string>;
}
