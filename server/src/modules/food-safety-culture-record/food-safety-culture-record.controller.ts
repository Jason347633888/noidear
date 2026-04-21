import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FoodSafetyCultureRecordService } from './food-safety-culture-record.service';
import { CreateFoodSafetyCultureRecordDto } from './dto/create-food-safety-culture-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('food-safety-culture-records')
@UseGuards(JwtAuthGuard)
export class FoodSafetyCultureRecordController {
  constructor(private service: FoodSafetyCultureRecordService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateFoodSafetyCultureRecordDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
