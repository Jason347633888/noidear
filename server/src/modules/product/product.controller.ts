import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductReportDocumentDto } from './dto/product-report-document.dto';
import { CreateLegacyProductDto } from './dto/create-legacy-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private service: ProductService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post('legacy')
  createLegacy(@Body() dto: CreateLegacyProductDto) {
    return this.service.createLegacy(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/workbench')
  getWorkbench(@Param('id') id: string) {
    return this.service.getWorkbench(id);
  }

  @Get(':id/reports')
  getReports(@Param('id') id: string) {
    return this.service.getReports(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Post(':id/reports')
  @UseInterceptors(FileInterceptor('file'))
  uploadReport(
    @Param('id') id: string,
    @Body() dto: ProductReportDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.service.uploadReport(id, dto, file, req.user?.id ?? 'system');
  }

  @Post(':id/reports/:linkId/replace')
  @UseInterceptors(FileInterceptor('file'))
  replaceReport(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Body() dto: ProductReportDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.service.replaceReport(id, linkId, dto, file, req.user?.id ?? 'system');
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
