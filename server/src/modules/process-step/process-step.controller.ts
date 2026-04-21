import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ProcessStepService } from './process-step.service';
import { CreateProcessStepDto } from './dto/create-process-step.dto';
import { UpdateProcessStepDto } from './dto/update-process-step.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('process-steps')
@UseGuards(JwtAuthGuard)
export class ProcessStepController {
  constructor(private service: ProcessStepService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.service.findByProduct(productId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProcessStepDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProcessStepDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
