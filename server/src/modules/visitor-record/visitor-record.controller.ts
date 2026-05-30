import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VisitorRecordService } from './visitor-record.service';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import {
  LinkDeclarationsDto,
  CheckInOptionsDto,
} from './dto/visitor-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ModuleKey('equipment_site')
@Controller('visitor-records')
@UseGuards(JwtAuthGuard)
export class VisitorRecordController {
  constructor(private service: VisitorRecordService) {}

  @Post()
  create(
    @Body() dto: CreateVisitorDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll(@Query('date') date?: string) {
    return this.service.findAll(date);
  }

  @Post(':id/declarations')
  linkDeclarations(
    @Param('id') id: string,
    @Body() dto: LinkDeclarationsDto,
  ) {
    return this.service.linkDeclarations(id, dto.items);
  }

  @Patch(':id/check-in')
  checkIn(
    @Param('id') id: string,
    @Body() dto: CheckInOptionsDto,
  ) {
    return this.service.checkIn(id, {
      requireApprovedHealth: dto.require_approved_health,
    });
  }

  @Patch(':id/exit')
  recordExit(@Param('id') id: string) {
    return this.service.recordExit(id);
  }
}
