import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function IsPlainObject(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPlainObject',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return (
            value === undefined ||
            (value !== null &&
              typeof value === 'object' &&
              !Array.isArray(value) &&
              Object.getPrototypeOf(value) === Object.prototype)
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a plain object`;
        },
      },
    });
  };
}

export class ApprovalTaskActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @IsOptional()
  @IsPlainObject()
  metadata?: Record<string, unknown>;
}

export class RejectApprovalTaskDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  comment!: string;

  @IsOptional()
  @IsPlainObject()
  metadata?: Record<string, unknown>;
}

export class TransferApprovalTaskDto {
  @IsString()
  targetUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
