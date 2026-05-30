import { Injectable } from '@nestjs/common';
import { ConfirmRecordFormLandingDto, UpdateRecordFormLandingEntryDto } from '../dto/document-control.dto';

/**
 * RecordFormLandingService
 *
 * Manages the record-form landing index — the catalogue that maps source
 * form codes to their target document templates within the business module.
 *
 * "Record form landing" refers to the governance step where unassigned form
 * codes are reviewed and confirmed to land in a specific template/module,
 * replacing the retired dynamic-form platform (migration 20260524090000).
 */
@Injectable()
export class RecordFormLandingService {
  list(): Promise<unknown[]> {
    return Promise.resolve([]);
  }

  get(_code: string): Promise<unknown> {
    return Promise.resolve({});
  }

  batchConfirmSuggested(_codes: string[], _actorId: string): Promise<{ confirmed: number }> {
    return Promise.resolve({ confirmed: 0 });
  }

  confirm(
    _code: string,
    _dto: ConfirmRecordFormLandingDto,
    _actorId: string,
  ): Promise<unknown> {
    return Promise.resolve({});
  }

  upsertTarget(_code: string, _dto: UpdateRecordFormLandingEntryDto): Promise<unknown> {
    return Promise.resolve({});
  }

  suggest(_code: string): Promise<unknown> {
    return Promise.resolve({});
  }

  getFieldCoverage(_code: string): Promise<unknown> {
    return Promise.resolve({});
  }
}
