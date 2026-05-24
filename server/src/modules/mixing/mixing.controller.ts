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
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MixingService } from './mixing.service';
import {
  RecommendMaterialBatchDto,
  CreateMixingExecutionDto,
  ListMixingExecutionsDto,
} from './dto/mixing.dto';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../module-access/ownership-context';
import { AuthenticatedRequest } from '../auth/authenticated-user';

@ModuleKey('production_execution')
@Controller('mixing')
@UseGuards(JwtAuthGuard)
export class MixingController {
  constructor(private readonly service: MixingService) {}

  @Get('executions')
  listExecutions(@Ownership() ownership: OwnershipContext, @Query() dto: ListMixingExecutionsDto) {
    return this.service.listExecutions(dto, ownership);
  }

  @Post('recommend-material-batches')
  recommend(@Body() dto: RecommendMaterialBatchDto) {
    return this.service.recommendMaterialBatches(dto);
  }

  @Post('executions')
  @HttpCode(HttpStatus.CREATED)
  createExecution(@Body() dto: CreateMixingExecutionDto, @Request() req: AuthenticatedRequest) {
    return this.service.createExecution(dto, req.user.id);
  }
}
