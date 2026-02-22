import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateAuditFindingDto } from './create-finding.dto';

export class UpdateAuditFindingDto extends PartialType(
  OmitType(CreateAuditFindingDto, ['planId', 'documentId'] as const),
) {}
