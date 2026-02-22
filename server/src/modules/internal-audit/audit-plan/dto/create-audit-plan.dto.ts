import {
  IsString,
  IsDateString,
  IsEnum,
  IsArray,
  ArrayMinSize,
  Length,
} from 'class-validator';

export class CreateAuditPlanDto {
  @IsString()
  @Length(5, 100, { message: 'Title must be between 5 and 100 characters' })
  title: string;

  @IsEnum(['quarterly', 'semiannual', 'annual'], {
    message: 'Type must be quarterly, semiannual, or annual',
  })
  type: string;

  @IsDateString({}, { message: 'Start date must be a valid date' })
  startDate: string;

  @IsDateString({}, { message: 'End date must be a valid date' })
  endDate: string;

  @IsString({ message: 'Auditor ID must be a string' })
  auditorId: string;

  @IsArray({ message: 'Document IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one document must be selected' })
  documentIds: string[];
}
