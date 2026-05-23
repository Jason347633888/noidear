import { ModuleKey } from '../../shared/decorators/module-key.decorator';
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
  Request,
} from '@nestjs/common';
import { ExternalPartyService } from './external-party.service';
import { CreateExternalPartyDto } from './dto/create-external-party.dto';
import { UpdateExternalPartyDto } from './dto/update-external-party.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';

@ModuleKey('warehouse')
@Controller('external-parties')
@UseGuards(JwtAuthGuard)
export class ExternalPartyController {
  constructor(private service: ExternalPartyService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest, @Query('party_type') partyType?: string) {
    return this.service.findAll(req.user.companyId, partyType);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Post()
  create(@Body() dto: CreateExternalPartyDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(req.user.companyId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExternalPartyDto, @Request() req: AuthenticatedRequest) {
    return this.service.update(id, req.user.companyId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.remove(id, req.user.companyId);
  }
}
