import { BadRequestException } from '@nestjs/common';
import { ApprovalActionMetadataValidator } from './approval-action-metadata.validator';

describe('ApprovalActionMetadataValidator', () => {
  const validator = new ApprovalActionMetadataValidator();

  it('normalizes optional maintenance approve signature', () => {
    const result = validator.validate({
      resourceType: 'maintenance_record',
      triggerKey: 'submit',
      stepKey: 'maintenance-record',
      action: 'APPROVED',
      metadata: { reviewerSignature: 'sig-url' },
    });
    expect(result).toEqual({ reviewerSignature: 'sig-url' });
  });

  it('drops empty optional fields', () => {
    const result = validator.validate({
      resourceType: 'maintenance_record',
      triggerKey: 'submit',
      stepKey: 'maintenance-record',
      action: 'APPROVED',
      metadata: { reviewerSignature: '' },
    });
    expect(result).toEqual({});
  });

  it('falls back to comment when reject metadata.rejectReason is missing', () => {
    const result = validator.validate({
      resourceType: 'maintenance_record',
      triggerKey: 'submit',
      stepKey: 'maintenance-record',
      action: 'REJECTED',
      comment: '资料不完整',
      metadata: undefined,
    });
    expect(result).toEqual({ rejectReason: '资料不完整' });
  });

  it('prefers explicit reject metadata over comment', () => {
    const result = validator.validate({
      resourceType: 'maintenance_record',
      triggerKey: 'submit',
      stepKey: 'maintenance-record',
      action: 'REJECTED',
      comment: '其他原因',
      metadata: { rejectReason: '缺少照片' },
    });
    expect(result).toEqual({ rejectReason: '缺少照片' });
  });

  it('rejects maintenance reject when comment and metadata are both empty', () => {
    expect(() =>
      validator.validate({
        resourceType: 'maintenance_record',
        triggerKey: 'submit',
        stepKey: 'maintenance-record',
        action: 'REJECTED',
        comment: '',
        metadata: {},
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects unknown rule keys that carry metadata', () => {
    expect(() =>
      validator.validate({
        resourceType: 'unknown_resource',
        triggerKey: 'submit',
        stepKey: 'unknown',
        action: 'APPROVED',
        metadata: { foo: 'bar' },
      }),
    ).toThrow(BadRequestException);
  });

  it('allows unknown rule keys with no metadata', () => {
    const result = validator.validate({
      resourceType: 'unknown_resource',
      triggerKey: 'submit',
      stepKey: 'unknown',
      action: 'APPROVED',
      metadata: undefined,
    });
    expect(result).toEqual({});
  });

  it('normalizes product recall review note', () => {
    const result = validator.validate({
      resourceType: 'product_recall',
      triggerKey: 'submit',
      stepKey: 'product-recall-review',
      action: 'APPROVED',
      metadata: { review_note: '风险可控' },
    });
    expect(result).toEqual({ review_note: '风险可控' });
  });

  it('rejects non-string field values', () => {
    expect(() =>
      validator.validate({
        resourceType: 'maintenance_record',
        triggerKey: 'submit',
        stepKey: 'maintenance-record',
        action: 'APPROVED',
        metadata: { reviewerSignature: 123 as unknown as string },
      }),
    ).toThrow(BadRequestException);
  });
});
