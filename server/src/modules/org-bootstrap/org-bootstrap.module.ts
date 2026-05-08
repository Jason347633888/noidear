import { Module } from '@nestjs/common';
import { OrgBootstrapController } from './org-bootstrap.controller';
import { OrgBootstrapService } from './org-bootstrap.service';

@Module({
  controllers: [OrgBootstrapController],
  providers: [OrgBootstrapService],
})
export class OrgBootstrapModule {}
