import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CompanyService } from './company.service';
import { CreateTenantDto, UpsertCompanyProfileDto } from './dto/company.dto';

@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  createTenant(@Body() dto: CreateTenantDto) {
    return this.service.createTenant(dto);
  }

  @Get(':companyId')
  getTenant(@Param('companyId') companyId: string) {
    return this.service.getTenant(companyId);
  }

  @Put(':companyId/profile')
  @UseGuards(RolesGuard)
  @Roles('admin')
  upsertProfile(
    @Param('companyId') companyId: string,
    @Body() dto: UpsertCompanyProfileDto,
  ) {
    return this.service.upsertProfile(companyId, dto);
  }
}
