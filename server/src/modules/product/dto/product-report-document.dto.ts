import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ProductReportDocumentDto {
  @IsString()
  @IsNotEmpty()
  reportName: string;

  @IsString()
  @IsOptional()
  reportNo?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  testedAt?: Date;

  @IsString()
  @IsOptional()
  conclusion?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  expiresAt?: Date;
}
