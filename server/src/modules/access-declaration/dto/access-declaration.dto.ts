import { IsString, IsObject, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';
import { Prisma } from '@prisma/client';

export const VALID_DECLARATION_TYPES = [
  'visitor_health',
  'visitor_confidentiality',
  'visitor_hygiene',
  'employee_exit',
  'goods_release',
  'package_inspection',
  'mail_inspection',
] as const;

export type DeclarationType = (typeof VALID_DECLARATION_TYPES)[number];

export class CreateAccessDeclarationDto {
  @IsString()
  @IsNotEmpty()
  declaration_type: string;

  @IsString()
  @IsNotEmpty()
  subject_type: string;

  @IsString()
  @IsOptional()
  subject_id?: string;

  @IsObject()
  @IsOptional()
  subject_snapshot?: Prisma.InputJsonValue;

  @IsObject()
  declaration_content: Prisma.InputJsonValue;

  @IsDateString()
  declared_at: string;

  @IsString()
  @IsOptional()
  evidence_file_id?: string;
}

export class ApproveAccessDeclarationDto {
  @IsString()
  @IsNotEmpty()
  conclusion: string;

  @IsString()
  @IsOptional()
  opinion?: string;
}

export class LinkToVisitorRecordDto {
  @IsString()
  @IsNotEmpty()
  visitor_record_id: string;
}

export class QueryAccessDeclarationDto {
  @IsString()
  @IsOptional()
  declaration_type?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
