import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProcessStepService } from './process-step.service';
import { CreateProcessStepDto } from './dto/create-process-step.dto';
import { UpdateProcessStepDto } from './dto/update-process-step.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';

@Controller('process-steps')
@UseGuards(JwtAuthGuard)
export class ProcessStepController {
  constructor(private service: ProcessStepService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.service.findAll(req.user.companyId);
  }

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string, @Request() req: AuthenticatedRequest) {
    return this.service.findByProduct(productId, req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Post()
  create(@Body() dto: CreateProcessStepDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProcessStepDto, @Request() req: AuthenticatedRequest) {
    return this.service.update(id, dto, req.user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.remove(id, req.user.companyId);
  }
}
