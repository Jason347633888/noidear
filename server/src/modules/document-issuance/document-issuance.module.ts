import { Module } from '@nestjs/common';
import { DocumentIssuanceController } from './document-issuance.controller';
import { DocumentIssuanceService } from './document-issuance.service';

@Module({
  controllers: [DocumentIssuanceController],
  providers: [DocumentIssuanceService],
  exports: [DocumentIssuanceService],
})
export class DocumentIssuanceModule {}
