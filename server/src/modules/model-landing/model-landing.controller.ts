import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ModelLandingService } from './model-landing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ModuleKey('product_rd')
@Controller('model-landing')
@UseGuards(JwtAuthGuard)
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
