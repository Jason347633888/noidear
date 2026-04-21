import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DocumentIssuanceService } from './document-issuance.service';
import { CreateDocumentIssuanceDto } from './dto/create-document-issuance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('document-issuances')
@UseGuards(JwtAuthGuard)
export class DocumentIssuanceController {
  constructor(private service: DocumentIssuanceService) {}

  @Post()
  create(@Body() dto: CreateDocumentIssuanceDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
