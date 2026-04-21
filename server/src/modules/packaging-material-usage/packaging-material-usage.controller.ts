import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PackagingMaterialUsageService } from './packaging-material-usage.service';
import { CreatePackagingMaterialUsageDto } from './dto/create-packaging-material-usage.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('packaging-material-usages')
@UseGuards(JwtAuthGuard)
export class PackagingMaterialUsageController {
  constructor(private service: PackagingMaterialUsageService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreatePackagingMaterialUsageDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
