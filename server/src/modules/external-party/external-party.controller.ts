import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ExternalPartyService } from './external-party.service';
import { CreateExternalPartyDto } from './dto/create-external-party.dto';
import { UpdateExternalPartyDto } from './dto/update-external-party.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('external-parties')
@UseGuards(JwtAuthGuard)
export class ExternalPartyController {
  constructor(private service: ExternalPartyService) {}

  @Get()
  findAll(@Query('party_type') partyType?: string) {
    return this.service.findAll(partyType);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateExternalPartyDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExternalPartyDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
