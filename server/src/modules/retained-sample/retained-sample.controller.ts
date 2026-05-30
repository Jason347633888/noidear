import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { RetainedSampleService } from './retained-sample.service';
import {
  CreateRetainedSampleDto,
  DisposeRetainedSampleDto,
  ListRetainedSamplesDto,
} from './dto/retained-sample.dto';

@UseGuards(JwtAuthGuard)
@Controller('retained-samples')
export class RetainedSampleController {
  constructor(private readonly service: RetainedSampleService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateRetainedSampleDto, @Request() req: AuthenticatedRequest) {
    return this.service.createRetainedSample(dto, req.user.companyId);
  }

  @Get()
  list(@Query() query: ListRetainedSamplesDto, @Request() req: AuthenticatedRequest) {
    const companyId = req.user.companyId;
    return this.service.listRetainedSamples({ ...query, company_id: companyId });
  }

  @Patch(':id/dispose')
  @UseGuards(RolesGuard)
  @Roles('admin')
  dispose(
    @Param('id') id: string,
    @Body() dto: DisposeRetainedSampleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.disposeRetainedSample(
      id,
      req.user.companyId,
      dto.disposal_action,
      dto.disposed_at instanceof Date ? dto.disposed_at : new Date(dto.disposed_at),
    );
  }
}
