import { Module } from '@nestjs/common';
import { CcpController } from './ccp.controller';
import { CcpService } from './ccp.service';

@Module({
  controllers: [CcpController],
  providers: [CcpService],
  exports: [CcpService],
})
export class CcpModule {}
