import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString,
  Min, ValidateIf, ValidateNested,
} from 'class-validator';

const ALLOWED_ASSIGNMENT_TYPES = ['USER', 'ROLE', 'DEPARTMENT_ROLE'] as const;
const ALLOWED_ROLE_CODES = ['admin', 'leader', 'user'] as const;

export class AssignmentDto {
  @IsIn(ALLOWED_ASSIGNMENT_TYPES as readonly string[])
  type!: 'USER' | 'ROLE' | 'DEPARTMENT_ROLE';

  @ValidateIf((o) => o.type === 'USER')
  @IsString() @IsNotEmpty()
  userId?: string;

  @ValidateIf((o) => o.type === 'ROLE' || o.type === 'DEPARTMENT_ROLE')
  @IsIn(ALLOWED_ROLE_CODES as readonly string[])
  roleCode?: 'admin' | 'leader' | 'user';

  @ValidateIf((o) => o.type === 'DEPARTMENT_ROLE')
  @IsString() @IsNotEmpty()
  departmentId?: string;

  @IsOptional() @IsString()
  label?: string;
}

export class StepDto {
  @IsString() @IsNotEmpty()
  stepKey!: string;

  @IsString() @IsNotEmpty()
  stepName!: string;

  @IsString() @IsNotEmpty()
  mode!: string;

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssignmentDto)
  assignments!: AssignmentDto[];

  @IsOptional() @IsString()
  rejectPolicy?: string;

  @IsOptional() @IsString()
  onApproved?: string;

  @IsOptional()
  @IsString()
  onRejected?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dueHours?: number;
}

export class CreateApprovalDefinitionDto {
  @IsString() module!: string;
  @IsString() resourceType!: string;
  @IsString() triggerKey!: string;
  @IsString() name!: string;
  @IsInt() @Min(1) version!: number;

  // 用户写入只允许 active|inactive；disabled_legacy 由系统内部置位
  @IsOptional() @IsString() @IsIn(['active', 'inactive'])
  status?: string;

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps!: StepDto[];
}

export class UpdateApprovalDefinitionDto {
  @IsOptional() @IsString() name?: string;

  @IsOptional() @IsString() @IsIn(['active', 'inactive'])
  status?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps?: StepDto[];
}
