import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AssetLoanRecordService } from './asset-loan-record.service';
import { CreateAssetLoanRecordDto } from './dto/create-asset-loan-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('asset-loan-records')
@UseGuards(JwtAuthGuard)
export class AssetLoanRecordController {
  constructor(private service: AssetLoanRecordService) {}

  @Post()
  create(@Body() dto: CreateAssetLoanRecordDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id/return')
  updateReturn(@Param('id') id: string) {
    return this.service.updateReturn(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
