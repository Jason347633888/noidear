import { BadRequestException } from '@nestjs/common';
import { DocumentControlMetadataService } from './services/document-control-metadata.service';

describe('DocumentControlMetadataService', () => {
  let service: DocumentControlMetadataService;

  beforeEach(() => {
    service = new DocumentControlMetadataService();
  });

  it('normalizes valid procedure metadata', () => {
    const result = service.normalize({
      documentType: 'PROCEDURE',
      sourceFolder: '02',
      tags: ['追溯'],
      metadata: { processArea: 'traceability' },
    });

    expect(result.document_type).toBe('PROCEDURE');
    expect(result.source_folder).toBe('02');
    expect(result.tags).toEqual(['追溯']);
  });

  it('rejects unsupported document type', () => {
    expect(() => service.normalize({
      documentType: 'BAD',
      metadata: {},
    } as any)).toThrow(BadRequestException);
  });

  it('rejects missing required metadata by type', () => {
    expect(() => service.normalize({
      documentType: 'EXTERNAL_FILE',
      sourceFolder: '06',
      metadata: { externalSource: 'GB' },
    })).toThrow('EXTERNAL_FILE missing required metadata');
  });
});
