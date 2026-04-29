import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkshopAreaService } from './workshop-area.service';

@UseGuards(JwtAuthGuard)
@Controller('workshop-areas')
export class WorkshopAreaController {
  constructor(private readonly service: WorkshopAreaService) {}

  @Get()
  findActive() {
    return this.service.findActive();
  }
}
