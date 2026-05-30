import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecordService } from './record.service';
import {
  CreateRecordDto,
  UpdateRecordDto,
  QueryRecordDto,
} from './dto/record.dto';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import type { OwnershipContext } from '../module-access/ownership-context';
import { AuthenticatedRequest } from '../auth/authenticated-user';

@UseGuards(JwtAuthGuard)
@ModuleKey('equipment_site')
@Controller('maintenance-records')
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateRecordDto, @Request() req: AuthenticatedRequest) {
    return this.recordService.create(dto, req.user.id, req.user.companyId);
  }

  @Get()
  findAll(@Query() query: QueryRecordDto, @Ownership() ownership: OwnershipContext) {
    return this.recordService.findAll(query, ownership);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recordService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRecordDto) {
    return this.recordService.update(id, dto);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Request() req: any) {
    return this.recordService.submit(id, req.user?.id);
  }
}
