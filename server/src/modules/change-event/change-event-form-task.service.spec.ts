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
});
