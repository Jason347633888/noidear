import { ModuleKey } from '../../shared/decorators/module-key.decorator';
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
  UseInterceptors,
  UploadedFile,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UnifiedPermissionGuard } from '../../shared/guards/unified-permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { SupplierService } from './supplier.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  QuerySupplierDto,
  CreateQualificationDto,
  SupplierControlledDocumentDto,
} from './dto/supplier.dto';

@ModuleKey('warehouse')
@Controller('warehouse/suppliers')
@UseGuards(JwtAuthGuard)
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

  @Post(':id/documents')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(UnifiedPermissionGuard)
  @RequirePermission('document:control_manage')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Param('id') id: string,
    @Body() dto: SupplierControlledDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.supplierService.uploadControlledDocument(id, dto, file, req.user?.id ?? 'system');
  }

  @Get(':id/documents')
  getDocuments(@Param('id') id: string) {
    return this.supplierService.getControlledDocuments(id);
  }

  @Post(':id/documents/:linkId/replace')
  @UseGuards(UnifiedPermissionGuard)
  @RequirePermission('document:control_manage')
  @UseInterceptors(FileInterceptor('file'))
  replaceDocument(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Body() dto: SupplierControlledDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.supplierService.replaceControlledDocument(id, linkId, dto, file, req.user?.id ?? 'system');
  }
}
