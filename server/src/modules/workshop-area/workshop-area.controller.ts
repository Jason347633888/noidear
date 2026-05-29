import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWorkshopAreaInput, WorkshopAreaService } from './workshop-area.service';

@UseGuards(JwtAuthGuard)
@ModuleKey('quality_compliance')
@Controller('workshop-areas')
export class WorkshopAreaController {
  constructor(private readonly service: WorkshopAreaService) {}

  @Get()
  findActive() {
    return this.service.findActive();
  }

  @Post()
  create(@Body() body: CreateWorkshopAreaInput) {
    return this.service.create(body);
  }
}
