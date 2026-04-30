import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MixingService } from './mixing.service';
import {
  RecommendMaterialBatchDto,
  CreateMixingExecutionDto,
} from './dto/mixing.dto';

@Controller('mixing')
@UseGuards(JwtAuthGuard)
export class MixingController {
  constructor(private readonly service: MixingService) {}

  @Post('recommend-material-batches')
  recommend(@Body() dto: RecommendMaterialBatchDto) {
    return this.service.recommendMaterialBatches(dto);
  }

  @Post('executions')
  @HttpCode(HttpStatus.CREATED)
  createExecution(@Body() dto: CreateMixingExecutionDto) {
    return this.service.createExecution(dto);
  }
}
