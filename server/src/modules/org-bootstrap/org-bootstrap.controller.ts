import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgBootstrapService } from './org-bootstrap.service';

@Controller('org-bootstrap')
@UseGuards(JwtAuthGuard)
export class OrgBootstrapController {
  constructor(private readonly bootstrapService: OrgBootstrapService) {}

  @Get('status')
  getStatus() {
    return this.bootstrapService.getStatus();
  }
}
