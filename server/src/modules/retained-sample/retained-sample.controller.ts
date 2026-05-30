import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { RetainedSampleService } from './retained-sample.service';
import {
  CreateRetainedSampleDto,
  DisposeRetainedSampleDto,
  ListRetainedSamplesDto,
} from './dto/retained-sample.dto';

@Controller('retained-samples')
export class RetainedSampleController {
  constructor(private readonly service: RetainedSampleService) {}

  @Post()
  create(@Body() dto: CreateRetainedSampleDto) {
    return this.service.createRetainedSample(dto);
  }

  @Get()
  list(@Query() query: ListRetainedSamplesDto, @Request() req: any) {
    const companyId = query.company_id ?? req.user?.companyId;
    return this.service.listRetainedSamples({ ...query, company_id: companyId });
  }

  @Patch(':id/dispose')
  dispose(
    @Param('id') id: string,
    @Body() dto: DisposeRetainedSampleDto,
    @Request() req: any,
  ) {
    const companyId = req.user?.companyId ?? '';
    return this.service.disposeRetainedSample(
      id,
      companyId,
      dto.disposal_action,
      dto.disposed_at instanceof Date ? dto.disposed_at : new Date(dto.disposed_at),
    );
  }
}
