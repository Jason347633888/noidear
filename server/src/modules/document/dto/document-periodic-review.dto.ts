import { IsDateString, IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { PERIODIC_REVIEW_CONCLUSIONS, PeriodicReviewConclusion } from '../document-periodic-review.service';

export class SchedulePeriodicReviewDto {
  @IsDateString()
  dueAt!: string;

  @IsString()
  reviewerId!: string;
}

export class CompletePeriodicReviewDto {
  @IsEnum(PERIODIC_REVIEW_CONCLUSIONS)
  conclusion!: PeriodicReviewConclusion;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  opinion?: string | null;
}
