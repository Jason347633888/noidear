import { Controller, Get } from '@nestjs/common';
import { WorkshopAreaService } from './workshop-area.service';

@Controller('workshop-areas')
export class WorkshopAreaController {
  constructor(private readonly service: WorkshopAreaService) {}

  @Get()
  findActive() {
    return this.service.findActive();
  }
}
