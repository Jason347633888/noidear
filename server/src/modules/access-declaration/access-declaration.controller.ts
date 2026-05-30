import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { AccessDeclarationService } from './access-declaration.service';
import {
  CreateAccessDeclarationDto,
  ApproveAccessDeclarationDto,
  LinkToVisitorRecordDto,
  QueryAccessDeclarationDto,
} from './dto/access-declaration.dto';

@ModuleKey('equipment_site')
@Controller('access-declarations')
@UseGuards(JwtAuthGuard)
export class AccessDeclarationController {
  constructor(private readonly service: AccessDeclarationService) {}

  @Post()
  create(
    @Body() dto: CreateAccessDeclarationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createDeclaration({
      ...dto,
      company_id: req.user.companyId,
      declared_by: req.user.id,
      declared_at: new Date(dto.declared_at),
    });
  }

  @Get()
  findAll(
    @Query() query: QueryAccessDeclarationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.findAll(req.user.companyId, query.declaration_type, query.status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Patch(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveAccessDeclarationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.approveDeclaration(
      id,
      req.user.companyId,
      req.user.id,
      dto.conclusion,
      dto.opinion,
    );
  }

  @Patch(':id/expire')
  expire(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.expireDeclaration(id, req.user.companyId);
  }

  @Post(':id/visitor-links')
  linkToVisitor(
    @Param('id') id: string,
    @Body() dto: LinkToVisitorRecordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.linkToVisitorRecord(id, dto.visitor_record_id, req.user.companyId);
  }
}
