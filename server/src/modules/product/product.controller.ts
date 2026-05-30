import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { ProductLabelService } from './product-label.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductReportDocumentDto } from './dto/product-report-document.dto';
import { CreateLegacyProductDto } from './dto/create-legacy-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../module-access/ownership-context';

@ModuleKey('product_rd')
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(
    private service: ProductService,
    private labelService: ProductLabelService,
  ) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post('legacy')
  createLegacy(@Body() dto: CreateLegacyProductDto, @Ownership() ownership: OwnershipContext) {
    if (ownership.roleCode !== 'admin') throw new ForbiddenException('仅管理员可写入产品主数据');
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

  @Get(':id/label-preview')
  getLabelPreview(@Param('id') id: string) {
    return this.labelService.generateProductLabelPreview(id);
  }

  @Post(':id/specification-export')
  @HttpCode(HttpStatus.CREATED)
  exportSpecification(@Param('id') id: string) {
    return this.labelService.generateProductSpecificationExport(id);
  }

  @Get(':id/reports')
  getReports(@Param('id') id: string) {
    return this.service.getReports(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto, @Ownership() ownership: OwnershipContext) {
    return this.service.createForOwnership(dto, ownership);
  }

  @Post(':id/reports')
  @UseInterceptors(FileInterceptor('file'))
  uploadReport(
    @Param('id') id: string,
    @Body() dto: ProductReportDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Ownership() ownership: OwnershipContext,
  ) {
    if (ownership.roleCode !== 'admin') throw new ForbiddenException('仅管理员可写入产品主数据');
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
    @Ownership() ownership: OwnershipContext,
  ) {
    if (ownership.roleCode !== 'admin') throw new ForbiddenException('仅管理员可替换产品报告');
    return this.service.replaceReport(id, linkId, dto, file, req.user?.id ?? 'system');
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Ownership() ownership: OwnershipContext) {
    if (ownership.roleCode !== 'admin') throw new ForbiddenException('仅管理员可修改产品主数据');
    return this.service.update(id, dto);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id') id: string, @Ownership() ownership: OwnershipContext) {
    if (ownership.roleCode !== 'admin') throw new ForbiddenException('仅管理员可归档产品主数据');
    return this.service.archive(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Ownership() ownership: OwnershipContext) {
    if (ownership.roleCode !== 'admin') throw new ForbiddenException('仅管理员可删除产品主数据');
    return this.service.remove(id);
  }
}
