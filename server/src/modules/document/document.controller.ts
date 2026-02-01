import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('文档管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @ApiOperation({ summary: '上传文档' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Body() dto: CreateDocumentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(pdf|word|excel)/i }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() _body: Record<string, unknown>,
  ) {
    const user = JSON.parse(_body.user as string || '{}');
    return this.documentService.create(dto, file, user.id);
  }

  @Get()
  @ApiOperation({ summary: '查询文档列表' })
  async findAll(@Query() query: DocumentQueryDto, @Body() _body: Record<string, unknown>) {
    const user = JSON.parse(_body.user as string || '{}');
    return this.documentService.findAll(query, user.id, user.role);
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: '待我审批' })
  async findPendingApprovals(@Body() _body: Record<string, unknown>) {
    const user = JSON.parse(_body.user as string || '{}');
    return this.documentService.findPendingApprovals(user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询文档详情' })
  async findOne(@Param('id') id: string) {
    return this.documentService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新文档' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() _body: Record<string, unknown>,
  ) {
    const user = JSON.parse(_body.user as string || '{}');
    return this.documentService.update(id, dto, file, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文档' })
  async remove(@Param('id') id: string, @Body() _body: Record<string, unknown>) {
    const user = JSON.parse(_body.user as string || '{}');
    return this.documentService.remove(id, user.id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: '提交审批' })
  async submitForApproval(@Param('id') id: string, @Body() _body: Record<string, unknown>) {
    const user = JSON.parse(_body.user as string || '{}');
    return this.documentService.submitForApproval(id, user.id);
  }
}
