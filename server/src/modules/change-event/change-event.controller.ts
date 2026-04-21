import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChangeEventService } from './change-event.service';
import { CreateChangeEventDto } from './dto/create-change-event.dto';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('change-events')
@UseGuards(JwtAuthGuard)
export class ChangeEventController {
  constructor(private service: ChangeEventService) {}

  @Post()
  create(
    @Body() dto: CreateChangeEventDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.approve(id, req.user.id);
  }

  @Post(':id/verifications')
  createVerification(
    @Param('id') id: string,
    @Body() dto: CreateVerificationDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.createVerification(
      { ...dto, change_event_id: id },
      req.user.id,
    );
  }

  @Get(':id/verifications')
  findVerifications(@Param('id') id: string) {
    return this.service.findVerifications(id);
  }
}
