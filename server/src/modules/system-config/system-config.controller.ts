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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import {
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
  QuerySystemConfigDto,
} from './dto/system-config.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * P0-6: 系统配置 CRUD API
 */
@ApiTags('系统配置管理')
@Controller('system-configs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建系统配置' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 409, description: '配置键已存在' })
  create(@Body() createDto: CreateSystemConfigDto) {
    return this.configService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '查询所有系统配置' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Query() query: QuerySystemConfigDto) {
    return this.configService.findAll(query);
  }

  @Get(':key')
  @ApiOperation({ summary: '根据 key 获取配置' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '配置不存在' })
  findByKey(@Param('key') key: string) {
    return this.configService.findByKey(key);
  }

  @Put(':key')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新配置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '配置不存在' })
  update(@Param('key') key: string, @Body() updateDto: UpdateSystemConfigDto) {
    return this.configService.update(key, updateDto);
  }

  @Delete(':key')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除配置' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '配置不存在' })
  remove(@Param('key') key: string) {
    return this.configService.remove(key);
  }
}
