import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { MeasuringEquipmentService } from './measuring-equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { CreateCalibrationDto } from './dto/create-calibration.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('measuring-equipment')
@UseGuards(JwtAuthGuard)
export class MeasuringEquipmentController {
  constructor(private service: MeasuringEquipmentService) {}

  @Post()
  createEquipment(@Body() dto: CreateEquipmentDto) {
    return this.service.createEquipment(dto);
  }

  @Get()
  findAllEquipment() {
    return this.service.findAllEquipment();
  }

  @Get('overdue')
  findOverdue() {
    return this.service.findOverdue();
  }

  @Post('calibrations')
  createCalibration(@Body() dto: CreateCalibrationDto) {
    return this.service.createCalibration(dto);
  }

  @Get(':id/calibrations')
  findCalibrationsByEquipment(@Param('id') id: string) {
    return this.service.findCalibrationsByEquipment(id);
  }
}
