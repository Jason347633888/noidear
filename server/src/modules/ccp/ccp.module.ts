import { Module } from '@nestjs/common';
import { NonConformanceModule } from '../non-conformance/non-conformance.module';
import { CcpController } from './ccp.controller';
import { CcpService } from './ccp.service';

@Module({
  imports: [NonConformanceModule],
  controllers: [CcpController],
  providers: [CcpService],
  exports: [CcpService],
})
export class CcpModule {}
