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
    @Request() req: { user: { id: string } },
  ) {
    return this.service.createDeclaration({
      ...dto,
      declared_by: dto.declared_by ?? req.user.id,
      declared_at: new Date(dto.declared_at),
    });
  }

  @Get()
  findAll(
    @Query() query: QueryAccessDeclarationDto,
    @Request() req: { user: { companyId?: string } },
  ) {
    const companyId = query.company_id ?? req.user.companyId ?? '1';
    return this.service.findAll(companyId, query.declaration_type, query.status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveAccessDeclarationDto,
  ) {
    return this.service.approveDeclaration(
      id,
      dto.approver_id,
      dto.conclusion,
      dto.opinion,
    );
  }

  @Patch(':id/expire')
  expire(@Param('id') id: string) {
    return this.service.expireDeclaration(id);
  }

  @Post(':id/visitor-links')
  linkToVisitor(
    @Param('id') id: string,
    @Body() dto: LinkToVisitorRecordDto,
  ) {
    return this.service.linkToVisitorRecord(id, dto.visitor_record_id);
  }
}
