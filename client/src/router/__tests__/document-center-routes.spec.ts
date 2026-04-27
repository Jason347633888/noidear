import { describe, expect, it } from 'vitest';
import router from '@/router';

describe('document center routes', () => {
  it('maps /documents to the unified system document center', () => {
    const resolved = router.resolve('/documents');
    const component = resolved.matched.at(-1)?.components?.default;

    expect(resolved.name).toBe('Documents');
    expect(String(component)).toContain('SystemDocumentCenter.vue');
  });

  it('redirects the legacy system library route to /documents', () => {
    const resolved = router.resolve('/documents/control/library');

    expect(resolved.matched.at(-1)?.redirect).toBe('/documents');
  });

  it('keeps detail and edit routes distinct from the document center', () => {
    expect(router.resolve('/documents/doc-1').name).toBe('DocumentDetail');
    expect(router.resolve('/documents/doc-1/edit').name).toBe('DocumentEdit');
  });
});
