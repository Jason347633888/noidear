import { ArrayNotEmpty, IsArray, IsObject, IsString } from 'class-validator';

export class CreateProductProcessChangeDraftDto {
  @IsString()
  productId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes!: string[];

  @IsObject()
  payloadJson!: Record<string, unknown>;
}

export class CreateProductProcessChangeDraftBodyDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes!: string[];

  @IsObject()
  payloadJson!: Record<string, unknown>;
}
