import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LinkDeclarationItemDto {
  @IsString()
  @IsNotEmpty()
  access_declaration_id: string;

  @IsString()
  @IsNotEmpty()
  declaration_type: string;
}

export class LinkDeclarationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LinkDeclarationItemDto)
  items: LinkDeclarationItemDto[];
}

export class CheckInOptionsDto {
  @IsOptional()
  @IsBoolean()
  require_approved_health?: boolean;
}
