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
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { TemplateService } from './template.service';
import { CreateTemplateDto, UpdateTemplateDto, TemplateQueryDto, ParseExcelDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('模板管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @ApiOperation({ summary: '创建模板' })
  async create(@Body() dto: CreateTemplateDto, @Req() req: any) {
    return this.templateService.create(dto, req.user.id);
  }

  @Post('from-excel')
  @ApiOperation({ summary: '从 Excel 创建模板' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async createFromExcel(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(xls|xlsx)/i }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    const level = Number(body.level) || 4;
    return this.templateService.createFromExcel(file, level, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '查询模板列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(@Query() query: TemplateQueryDto) {
    return this.templateService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询模板详情' })
  async findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新模板' })
  async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templateService.update(id, dto);
  }

  @Post(':id/copy')
  @ApiOperation({ summary: '复制模板' })
  async copy(@Param('id') id: string, @Req() req: any) {
    return this.templateService.copy(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除模板' })
  async remove(@Param('id') id: string) {
    return this.templateService.remove(id);
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: '切换模板状态' })
  async toggleStatus(@Param('id') id: string) {
    return this.templateService.toggleStatus(id);
  }

  @Post('parse-excel')
  @ApiOperation({ summary: '解析 Excel 文件' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async parseExcel(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(xls|xlsx)/i }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.templateService.parseExcel(file);
  }

  @Put(':id/tolerance')
  @ApiOperation({ summary: '更新模板公差配置' })
  async updateTolerance(
    @Param('id') id: string,
    @Body() config: Record<string, any>,
  ) {
    return this.templateService.updateToleranceConfig(id, config);
  }
}
