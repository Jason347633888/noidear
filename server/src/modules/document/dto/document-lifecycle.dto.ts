import { IsOptional, IsDateString, IsString, MinLength, MaxLength } from 'class-validator';

export class PublishDocumentDto {
  @IsOptional() @IsDateString()
  effective_date?: string;

  @IsOptional() @IsDateString()
  review_due_date?: string;
}

export class RollbackDocumentVersionDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
