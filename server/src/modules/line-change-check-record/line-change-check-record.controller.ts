import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { LineChangeCheckRecordService } from './line-change-check-record.service';
import { CreateLineChangeCheckRecordDto } from './dto/create-line-change-check-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import type { OwnershipContext } from '../module-access/ownership-context';

@ModuleKey('production_execution')
@Controller('line-change-check-records')
@UseGuards(JwtAuthGuard)
export class LineChangeCheckRecordController {
  constructor(private service: LineChangeCheckRecordService) {}

  @Get()
  findAll(@Ownership() ownership: OwnershipContext) {
    return this.service.findAll(ownership);
  }

  @Post()
  create(@Body() dto: CreateLineChangeCheckRecordDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
