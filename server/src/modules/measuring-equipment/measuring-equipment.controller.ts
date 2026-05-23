import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MeasuringEquipmentService } from './measuring-equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { CreateCalibrationDto } from './dto/create-calibration.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';

@ModuleKey('quality_compliance')
@Controller('measuring-equipment')
@UseGuards(JwtAuthGuard)
export class MeasuringEquipmentController {
  constructor(private service: MeasuringEquipmentService) {}

  @Post()
  createEquipment(@Body() dto: CreateEquipmentDto, @Request() req: AuthenticatedRequest) {
    return this.service.createEquipment(dto, req.user.companyId);
  }

  @Get()
  findAllEquipment(@Request() req: AuthenticatedRequest) {
    return this.service.findAllEquipment(req.user.companyId);
  }

  @Get('overdue')
  findOverdue(@Request() req: AuthenticatedRequest) {
    return this.service.findOverdue(req.user.companyId);
  }

  @Post('calibrations')
  createCalibration(@Body() dto: CreateCalibrationDto, @Request() req: AuthenticatedRequest) {
    return this.service.createCalibration(dto, req.user.companyId);
  }

  @Get(':id/calibrations')
  findCalibrationsByEquipment(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findCalibrationsByEquipment(id, req.user.companyId);
  }
}
