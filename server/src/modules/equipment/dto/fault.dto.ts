import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFaultDto {
  @IsString()
  @IsNotEmpty()
  equipmentId: string;

  @IsString()
  @IsNotEmpty()
  reporterId: string;

  @IsEnum(['urgent', 'normal', 'low'])
  @IsOptional()
  urgencyLevel?: string;

  @IsString()
  @IsNotEmpty()
  faultDescription: string;

  @IsArray()
  @IsOptional()
  faultPhotos?: string[];
}

export class AcceptFaultDto {
  @IsString()
  @IsNotEmpty()
  assigneeId: string;
}

export class CompleteFaultDto {
  @IsString()
  @IsOptional()
  repairDescription?: string;

  @IsArray()
  @IsOptional()
  repairPhotos?: string[];

  @IsString()
  @IsOptional()
  repairSignature?: string;

  @IsString()
  @IsOptional()
  faultCause?: string;

  @IsString()
  @IsOptional()
  solution?: string;
}

export class QueryFaultDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @IsString()
  @IsOptional()
  equipmentId?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  urgencyLevel?: string;

  @IsString()
  @IsOptional()
  reporterId?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;
}
