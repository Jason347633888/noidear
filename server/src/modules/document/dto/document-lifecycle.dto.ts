import { IsOptional, IsDateString } from 'class-validator';

export class PublishDocumentDto {
  @IsOptional() @IsDateString()
  effective_date?: string;

  @IsOptional() @IsDateString()
  review_due_date?: string;
}
