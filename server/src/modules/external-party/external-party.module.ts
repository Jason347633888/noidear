import { Module } from '@nestjs/common';
import { ExternalPartyController } from './external-party.controller';
import { ExternalPartyService } from './external-party.service';
import { ExternalPartyEvaluationService } from './external-party-evaluation.service';

@Module({
  controllers: [ExternalPartyController],
  providers: [ExternalPartyService, ExternalPartyEvaluationService],
  exports: [ExternalPartyService, ExternalPartyEvaluationService],
})
export class ExternalPartyModule {}
