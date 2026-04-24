import { Controller, Get, Param } from '@nestjs/common';
import { ModelLandingService } from './model-landing.service';

@Controller('model-landing')
export class ModelLandingController {
  constructor(private readonly modelLandingService: ModelLandingService) {}

  @Get('summary')
  getSummary() {
    return this.modelLandingService.getSummary();
  }

  @Get('groups')
  listGroups() {
    return this.modelLandingService.listGroups();
  }

  @Get('groups/:groupId')
  getGroup(@Param('groupId') groupId: string) {
    return this.modelLandingService.getGroup(groupId);
  }

  @Get('forms/:code')
  getForm(@Param('code') code: string) {
    return this.modelLandingService.getFormByCode(code);
  }
}
