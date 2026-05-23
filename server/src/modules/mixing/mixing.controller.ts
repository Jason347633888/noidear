import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MixingService } from './mixing.service';
import {
  RecommendMaterialBatchDto,
  CreateMixingExecutionDto,
  ListMixingExecutionsDto,
} from './dto/mixing.dto';

@ModuleKey('production_execution')
@Controller('mixing')
@UseGuards(JwtAuthGuard)
export class MixingController {
  constructor(private readonly service: MixingService) {}

  @Get('executions')
  listExecutions(@Query() dto: ListMixingExecutionsDto) {
    return this.service.listExecutions(dto);
  }

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
