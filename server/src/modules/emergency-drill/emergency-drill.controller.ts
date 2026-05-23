import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { EmergencyDrillService } from './emergency-drill.service';
import { CreateDrillDto } from './dto/create-drill.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ModuleKey('equipment_site')
@Controller('emergency-drills')
@UseGuards(JwtAuthGuard)
export class EmergencyDrillController {
  constructor(private service: EmergencyDrillService) {}

  @Post()
  create(
    @Body() dto: CreateDrillDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
