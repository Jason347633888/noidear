import { PartialType } from '@nestjs/mapped-types';
import { CreateExternalPartyDto } from './create-external-party.dto';

export class UpdateExternalPartyDto extends PartialType(CreateExternalPartyDto) {}
