import { IsObject, IsOptional } from 'class-validator';

export class SubmitTaskDto {
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  deviationReasons?: Record<string, string>;
}
