import { IsOptional, IsString } from 'class-validator';

export class CreateTenantDto {
  @IsString() name: string;
  @IsOptional() @IsString() timezone?: string;
}

export class UpsertCompanyProfileDto {
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() unifiedSocialCreditCode?: string;
  @IsOptional() @IsString() manufacturerName?: string;
  @IsOptional() @IsString() manufacturerAddress?: string;
  @IsOptional() @IsString() manufacturerPhone?: string;
  @IsOptional() @IsString() originPlace?: string;
  @IsOptional() @IsString() foodProductionLicense?: string;
}
