type DocumentVersionShape = {
  versionNo?: number | string | null;
  version?: unknown;
};

function numericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toString?: unknown }).toString === 'function'
  ) {
    const parsed = Number((value as { toString: () => string }).toString());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function resolveDocumentVersionNo(document: DocumentVersionShape): number {
  const explicit = numericValue(document.versionNo);
  if (explicit !== null && explicit >= 1) return Math.trunc(explicit);

  const legacy = numericValue(document.version);
  if (legacy !== null && legacy >= 1) return Math.max(1, Math.trunc(legacy));

  return 1;
}

export function withDocumentVersionLabel<T extends DocumentVersionShape>(
  document: T,
): T & { versionNo: number; versionLabel: string } {
  const versionNo = resolveDocumentVersionNo(document);
  return {
    ...document,
    versionNo,
    versionLabel: `V${versionNo}`,
  };
}

export function withDocumentVersionLabels<T extends DocumentVersionShape>(
  documents: T[],
): Array<T & { versionNo: number; versionLabel: string }> {
  return documents.map(withDocumentVersionLabel);
}
