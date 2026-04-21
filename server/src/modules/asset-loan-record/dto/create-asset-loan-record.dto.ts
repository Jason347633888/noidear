import { IsString, IsOptional, IsIn, IsDateString } from 'class-validator';

export class CreateAssetLoanRecordDto {
  @IsString()
  @IsIn(['equipment', 'tool', 'vehicle', 'furniture', 'other'])
  asset_type: string;

  @IsString()
  asset_name: string;

  @IsOptional()
  @IsString()
  asset_code?: string;

  @IsOptional()
  @IsString()
  borrower_id?: string;

  @IsOptional()
  @IsString()
  borrower_name?: string;

  @IsOptional()
  @IsDateString()
  borrow_at?: string;

  @IsOptional()
  @IsDateString()
  expected_return?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  approver_id?: string;

  @IsOptional()
  @IsString()
  @IsIn(['borrowed', 'returned', 'overdue'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
