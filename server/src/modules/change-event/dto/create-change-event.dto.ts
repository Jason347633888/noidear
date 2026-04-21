import { IsString, IsOptional } from 'class-validator';

export class CreateChangeEventDto {
  @IsString() change_type: string; // 'recipe'|'process'|'equipment'|'supplier'|'other'
  @IsString() title: string;
  @IsString() description: string;
  @IsOptional() @IsString() initiator_id?: string;
  @IsOptional() @IsString() status?: string;
}
