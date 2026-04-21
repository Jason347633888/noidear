import { IsString, IsOptional } from 'class-validator';

export class CreateChangeApprovalDto {
  @IsString() change_event_id: string;
  @IsOptional() @IsString() approver_id?: string;
  @IsOptional() @IsString() decision?: string; // approved, rejected, pending
  @IsOptional() @IsString() comments?: string;
  @IsOptional() @IsString() approved_at?: string; // ISO date string
}
