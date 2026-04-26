import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentControlMetadataDto } from '../dto/document-control.dto';
import {
  DOCUMENT_TYPES,
  DocumentType,
  REQUIRED_METADATA_BY_TYPE,
  SOURCE_FOLDERS,
} from '../constants/document-control.constants';

@Injectable()
export class DocumentControlMetadataService {
  normalize(control?: DocumentControlMetadataDto) {
    if (!control) return {};

    const documentType = control.documentType?.trim();
    const sourceFolder = control.sourceFolder?.trim();

    if (documentType && !DOCUMENT_TYPES.includes(documentType as DocumentType)) {
      throw new BadRequestException(`Unsupported documentType: ${documentType}`);
    }

    if (sourceFolder && !SOURCE_FOLDERS.includes(sourceFolder as any)) {
      throw new BadRequestException(`Unsupported sourceFolder: ${sourceFolder}`);
    }

    if (documentType) {
      this.validateRequiredMetadata(documentType as DocumentType, control.metadata ?? {});
    }

    return {
      document_type: documentType,
      source_folder: sourceFolder,
      owner_department: control.ownerDepartment?.trim() || null,
      owner_user_id: control.ownerUserId?.trim() || null,
      tags: control.tags ?? [],
      metadata: control.metadata ?? null,
      external_source: control.externalSource?.trim() || null,
      external_expires_at: control.externalExpiresAt ? new Date(control.externalExpiresAt) : null,
      lineage_key: control.lineageKey?.trim() || null,
      effective_date: control.effectiveDate ? new Date(control.effectiveDate) : undefined,
      review_due_date: control.reviewDueDate ? new Date(control.reviewDueDate) : undefined,
      content_md: control.contentMd ?? undefined,
    };
  }

  private validateRequiredMetadata(documentType: DocumentType, metadata: Record<string, unknown>) {
    const required = REQUIRED_METADATA_BY_TYPE[documentType];
    const missing = required.filter((key) => {
      const value = metadata[key];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      throw new BadRequestException(
        `${documentType} missing required metadata: ${missing.join(', ')}`,
      );
    }
  }
}
