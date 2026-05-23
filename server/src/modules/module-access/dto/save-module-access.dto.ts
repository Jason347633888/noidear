import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, ValidateNested } from 'class-validator';
import { MODULE_KEYS } from '../module-access.constants';

export class SaveModuleAccessRowDto {
  @IsIn(MODULE_KEYS as readonly string[])
  moduleKey!: string;

  @IsBoolean()
  leader!: boolean;

  @IsBoolean()
  user!: boolean;
}

export class SaveModuleAccessDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaveModuleAccessRowDto)
  modules!: SaveModuleAccessRowDto[];
}
