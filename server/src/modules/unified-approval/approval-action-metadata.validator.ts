import { BadRequestException, Injectable } from '@nestjs/common';
import type { ApprovalActionMetadata, ApprovalActionValidationContext } from './types';

type Rule = (context: ApprovalActionValidationContext) => ApprovalActionMetadata;

@Injectable()
export class ApprovalActionMetadataValidator {
  private readonly rules: Record<string, Rule> = {
    'maintenance_record:submit:maintenance-record:APPROVED': (context) =>
      this.optionalStringObject(context.metadata, 'reviewerSignature'),
    'maintenance_record:submit:maintenance-record:REJECTED': (context) => ({
      rejectReason: this.requireStringWithFallback(
        context.metadata,
        'rejectReason',
        context.comment,
        '驳回原因不能为空',
      ),
    }),
    'product_recall:submit:product-recall-review:APPROVED': (context) =>
      this.optionalStringObject(context.metadata, 'review_note'),
    'product_recall:submit:product-recall-review:REJECTED': (context) =>
      this.optionalStringObject(context.metadata, 'review_note'),
    'deviation_report:submit:deviation-submit:REJECTED': (context) =>
      this.optionalStringObject(context.metadata, 'rejectReason'),
  };

  validate(context: ApprovalActionValidationContext): ApprovalActionMetadata {
    const key = `${context.resourceType}:${context.triggerKey}:${context.stepKey}:${context.action}`;
    const rule = this.rules[key];
    if (rule) return rule(context);
    if (context.metadata && Object.keys(context.metadata).length > 0) {
      throw new BadRequestException(`No approval action metadata rule registered for ${key}`);
    }
    return {};
  }

  private optionalStringObject(
    metadata: ApprovalActionMetadata | undefined,
    field: string,
  ): ApprovalActionMetadata {
    if (!metadata || metadata[field] == null || metadata[field] === '') return {};
    if (typeof metadata[field] !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }
    return { [field]: metadata[field] };
  }

  private requireString(
    metadata: ApprovalActionMetadata | undefined,
    field: string,
    message: string,
  ): string {
    const value = metadata?.[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(message);
    }
    return value.trim();
  }

  private requireStringWithFallback(
    metadata: ApprovalActionMetadata | undefined,
    field: string,
    fallback: string | undefined,
    message: string,
  ): string {
    const direct = metadata?.[field];
    if (typeof direct === 'string' && direct.trim().length > 0) {
      return direct.trim();
    }
    if (typeof fallback === 'string' && fallback.trim().length > 0) {
      return fallback.trim();
    }
    throw new BadRequestException(message);
  }
}
