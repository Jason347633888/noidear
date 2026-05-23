import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccessService } from './module-access.service';

@UseGuards(JwtAuthGuard)
@Controller('module-access')
export class ModuleAccessController {
  constructor(private readonly service: ModuleAccessService) {}

  @Get()
  async getMine(@Request() req: any) {
    const roleCode = req.user?.roleCode ?? '';
    const enabledModules = await this.service.getEnabledModulesFor({ roleCode });
    return { roleCode, enabledModules };
  }
}
