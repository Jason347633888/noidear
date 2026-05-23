import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ModuleAccessService } from './module-access.service';
import { SaveModuleAccessDto } from './dto/save-module-access.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/module-access')
export class AdminModuleAccessController {
  constructor(private readonly service: ModuleAccessService) {}

  @Get()
  async list() {
    return { modules: await this.service.listMatrix() };
  }

  @Put()
  async save(@Body() body: SaveModuleAccessDto) {
    await this.service.saveMatrix(body.modules as any);
    return { modules: await this.service.listMatrix() };
  }
}
