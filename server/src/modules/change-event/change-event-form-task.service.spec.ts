import { getDefaultFormCodesForChangeType } from './change-event-default-form-rules';

describe('change event default form rules', () => {
  it('excludes product change application and product development review from generic changes', () => {
    const allCodes = [
      ...getDefaultFormCodesForChangeType('product'),
      ...getDefaultFormCodesForChangeType('recipe'),
      ...getDefaultFormCodesForChangeType('process'),
      ...getDefaultFormCodesForChangeType('document'),
      ...getDefaultFormCodesForChangeType('record_form'),
    ];

    expect(allCodes).not.toContain('GRSS-KF-JL-03');
    expect(allCodes).not.toContain('GRSS-KF-JL-01');
  });

  it('returns correct codes for recipe change type', () => {
    const codes = getDefaultFormCodesForChangeType('recipe');
    expect(codes).toEqual(['GRSS-KF-JL-07', 'GRSS-KF-JL-08']);
  });

  it('returns empty array for unknown change type', () => {
    const codes = getDefaultFormCodesForChangeType('unknown_type_xyz');
    expect(codes).toEqual([]);
  });

  it('returns empty array for document and record_form change types', () => {
    expect(getDefaultFormCodesForChangeType('document')).toEqual([]);
    expect(getDefaultFormCodesForChangeType('record_form')).toEqual([]);
  });
});
