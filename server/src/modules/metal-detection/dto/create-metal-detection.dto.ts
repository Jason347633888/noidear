import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateMetalDetectionDto {
  @IsString() production_batch_id: string;
  @IsOptional() @IsString() fe_ball_spec?: string;
  @IsOptional() @IsString() sus_ball_spec?: string;
  @IsOptional() @IsString() al_ball_spec?: string;
  @IsBoolean() fe_test_pass: boolean;
  @IsBoolean() sus_test_pass: boolean;
  @IsBoolean() al_test_pass: boolean;
  @IsBoolean() overall_pass: boolean;
  @IsOptional() @IsString() rejection_action?: string;
}
