import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MetalDetectionService } from './metal-detection.service';
import { CreateMetalDetectionDto } from './dto/create-metal-detection.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('metal-detections')
@UseGuards(JwtAuthGuard)
export class MetalDetectionController {
  constructor(private service: MetalDetectionService) {}

  @Post()
  create(@Body() dto: CreateMetalDetectionDto, @Request() req: { user: { id: string } }) {
    return this.service.create(dto, req.user.id);
  }

  @Get('batch/:batchId')
  findByBatch(@Param('batchId') batchId: string) {
    return this.service.findByBatch(batchId);
  }
}
