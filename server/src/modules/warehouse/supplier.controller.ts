import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SupplierService } from './supplier.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  QuerySupplierDto,
  CreateQualificationDto,
} from './dto/supplier.dto';

@Controller('api/v1/suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.supplierService.create(createSupplierDto);
  }

  @Get()
  findAll(@Query() query: QuerySupplierDto) {
    return this.supplierService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supplierService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    return this.supplierService.update(id, updateSupplierDto);
  }

  @Put(':id/disable')
  disable(@Param('id') id: string) {
    return this.supplierService.disable(id);
  }

  @Post(':id/qualifications')
  @HttpCode(HttpStatus.CREATED)
  addQualification(
    @Param('id') id: string,
    @Body() createQualificationDto: CreateQualificationDto,
  ) {
    return this.supplierService.addQualification(id, createQualificationDto);
  }

  @Get(':id/qualifications')
  getQualifications(@Param('id') id: string) {
    return this.supplierService.getQualifications(id);
  }
}
