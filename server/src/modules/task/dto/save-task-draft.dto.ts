import { IsOptional, IsObject } from 'class-validator';

export class SaveTaskDraftDto {
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
