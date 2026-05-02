import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RecallReviewDto {
  @IsOptional()
  @IsString()
  review_note?: string;
}

export class RecallCompleteDto {
  @IsString()
  @IsNotEmpty()
  completion_summary!: string;
}

export class RecallCancelDto {
  @IsString()
  @IsNotEmpty()
  cancel_reason!: string;
}

export class MarkNotificationSentDto {
  @IsOptional()
  @IsString()
  response_summary?: string;
}
