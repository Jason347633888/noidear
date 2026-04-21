import { IsString, IsOptional } from 'class-validator';

export class CreateChangeVerificationRecordDto {
  @IsString() change_event_id: string;
  @IsOptional() @IsString() verifier_id?: string;
  @IsOptional() @IsString() verification_method?: string;
  @IsOptional() @IsString() result?: string; // pass, fail, conditional_pass
  @IsOptional() @IsString() findings?: string;
  @IsOptional() @IsString() notes?: string;
}
