import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ApproveDocumentDto } from './approve-document.dto';

describe('ApproveDocumentDto (NEW-003)', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(ApproveDocumentDto, plain);
    return validate(dto);
  }

  it('should pass for valid status "approved"', async () => {
    const errors = await validateDto({ status: 'approved' });
    expect(errors).toHaveLength(0);
  });

  it('should pass for valid status "rejected" with comment', async () => {
    const errors = await validateDto({
      status: 'rejected',
      comment: 'Needs revision',
    });
    expect(errors).toHaveLength(0);
  });

  it('should pass for "rejected" without comment (comment is optional)', async () => {
    const errors = await validateDto({ status: 'rejected' });
    expect(errors).toHaveLength(0);
  });

  it('should fail for invalid status "pending"', async () => {
    const errors = await validateDto({ status: 'pending' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail for invalid status "draft"', async () => {
    const errors = await validateDto({ status: 'draft' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when status is missing', async () => {
    const errors = await validateDto({});
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when status is empty string', async () => {
    const errors = await validateDto({ status: '' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when comment exceeds 500 characters', async () => {
    const errors = await validateDto({
      status: 'rejected',
      comment: 'a'.repeat(501),
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass when comment is exactly 500 characters', async () => {
    const errors = await validateDto({
      status: 'rejected',
      comment: 'a'.repeat(500),
    });
    expect(errors).toHaveLength(0);
  });
});
