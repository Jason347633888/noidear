import { Module } from '@nestjs/common';
import { EnvironmentRecordController } from './environment-record.controller';
import { EnvironmentRecordService } from './environment-record.service';

@Module({
  controllers: [EnvironmentRecordController],
  providers: [EnvironmentRecordService],
  exports: [EnvironmentRecordService],
})
export class EnvironmentRecordModule {}
