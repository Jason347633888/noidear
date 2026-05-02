import { Decimal } from '@prisma/client/runtime/library';
import {
  resolveDocumentVersionNo,
  withDocumentVersionLabel,
  withDocumentVersionLabels,
} from './document-version.presenter';

describe('document version presenter', () => {
  it('uses explicit versionNo as the controlled document version', () => {
    expect(resolveDocumentVersionNo({ versionNo: 3, version: new Decimal('1.2') })).toBe(3);
  });

  it('falls back to the integer part of legacy Decimal version', () => {
    expect(resolveDocumentVersionNo({ version: new Decimal('2.0') })).toBe(2);
    expect(resolveDocumentVersionNo({ version: new Decimal('1.2') })).toBe(1);
  });

  it('decorates one document with a Vn label', () => {
    expect(withDocumentVersionLabel({ id: 'doc-1', versionNo: 2 })).toEqual({
      id: 'doc-1',
      versionNo: 2,
      versionLabel: 'V2',
    });
  });

  it('decorates document lists with Vn labels', () => {
    expect(withDocumentVersionLabels([{ id: 'doc-1', versionNo: 1 }, { id: 'doc-2', versionNo: 2 }])).toEqual([
      { id: 'doc-1', versionNo: 1, versionLabel: 'V1' },
      { id: 'doc-2', versionNo: 2, versionLabel: 'V2' },
    ]);
  });
});
