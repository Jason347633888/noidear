import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ChangeEventRelationDto {
  @IsString()
  targetType: string;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsString()
  targetRoute?: string;

  @IsString()
  targetLabel: string;

  @IsOptional()
  @IsString()
  relationType?: string;

  @IsOptional()
  @IsString()
  impactLevel?: string;

  @IsOptional()
  @IsString()
  requiredAction?: string;
}

export class CreateChangeEventDto {
  @IsIn(['document', 'product', 'recipe', 'process', 'equipment', 'supplier', 'haccp', 'other'])
  change_type: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  initiator_id?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChangeEventRelationDto)
  relations?: ChangeEventRelationDto[];
}
