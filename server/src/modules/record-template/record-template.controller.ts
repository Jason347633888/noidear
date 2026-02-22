import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RecordTemplateService } from './record-template.service';
import { CreateRecordTemplateDto } from './dto/create-record-template.dto';
import { UpdateRecordTemplateDto } from './dto/update-record-template.dto';
import { QueryRecordTemplateDto } from './dto/query-record-template.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('记录模板管理')
@Controller('record-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RecordTemplateController {
  constructor(private readonly templateService: RecordTemplateService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建记录模板' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 409, description: '模板编号已存在' })
  create(@Body() createDto: CreateRecordTemplateDto) {
    return this.templateService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '查询记录模板列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Query() query: QueryRecordTemplateDto) {
    return this.templateService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询记录模板详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新记录模板' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  update(@Param('id') id: string, @Body() updateDto: UpdateRecordTemplateDto) {
    return this.templateService.update(id, updateDto);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '归档记录模板' })
  @ApiResponse({ status: 200, description: '归档成功' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  archive(@Param('id') id: string) {
    return this.templateService.archive(id);
  }

  /**
   * P1-17: 创建模板新版本
   */
  @Post(':id/new-version')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建模板新版本' })
  @ApiResponse({ status: 201, description: '版本创建成功' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  createNewVersion(@Param('id') id: string, @Body() updateDto: UpdateRecordTemplateDto) {
    return this.templateService.createNewVersion(id, updateDto);
  }

  /**
   * P1-17: 查询模板版本历史
   */
  @Get('versions/:code')
  @ApiOperation({ summary: '查询模板版本历史' })
  @ApiResponse({ status: 200, description: '查询成功' })
  getVersionHistory(@Param('code') code: string) {
    return this.templateService.getVersionHistory(code);
  }
}
