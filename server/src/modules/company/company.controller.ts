import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateTenantDto, UpsertCompanyProfileDto } from './dto/company.dto';

@Controller('companies')
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  @Post()
  createTenant(@Body() dto: CreateTenantDto) {
    return this.service.createTenant(dto);
  }

  @Get(':companyId')
  getTenant(@Param('companyId') companyId: string) {
    return this.service.getTenant(companyId);
  }

  @Put(':companyId/profile')
  upsertProfile(
    @Param('companyId') companyId: string,
    @Body() dto: UpsertCompanyProfileDto,
  ) {
    return this.service.upsertProfile(companyId, dto);
  }
}
