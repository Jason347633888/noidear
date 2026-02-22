import {
  Controller,
  Delete,
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
import { FineGrainedPermissionService } from './fine-grained-permission.service';
import {
  CreateFineGrainedPermissionDto,
  UpdateFineGrainedPermissionDto,
  QueryFineGrainedPermissionDto,
  SaveRolePermissionsDto,
} from './dto/fine-grained-permission.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('细粒度权限管理')
@Controller('fine-grained-permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FineGrainedPermissionController {
  constructor(
    private readonly fineGrainedPermissionService: FineGrainedPermissionService,
  ) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: '查询所有细粒度权限定义' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  findAll(@Query() query: QueryFineGrainedPermissionDto) {
    return this.fineGrainedPermissionService.findAll(query);
  }

  // Critical 1: 静态路由必须在动态路由 :id 之前定义，否则 NestJS 会将 'matrix' 当作 id
  @Get('matrix/resource-action')
  @Roles('admin')
  @ApiOperation({ summary: '获取资源-操作权限矩阵' })
  @ApiResponse({ status: 200, description: '权限矩阵' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  getMatrix() {
    return this.fineGrainedPermissionService.getPermissionMatrix();
  }

  // Critical 2: 获取角色的所有细粒度权限配置
  @Get('role/:roleId')
  @Roles('admin')
  @ApiOperation({ summary: '获取角色的细粒度权限列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  getRolePermissions(@Param('roleId') roleId: string) {
    return this.fineGrainedPermissionService.getRolePermissions(roleId);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: '查询细粒度权限详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '权限不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  findOne(@Param('id') id: string) {
    return this.fineGrainedPermissionService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建细粒度权限定义' })
  @ApiResponse({ status: 201, description: '权限创建成功' })
  @ApiResponse({ status: 409, description: '权限已存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  create(@Body() createDto: CreateFineGrainedPermissionDto) {
    return this.fineGrainedPermissionService.create(createDto);
  }

  // Critical 2: 批量保存角色权限配置（传入权限 ID 数组）
  @Put('role/:roleId')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量保存角色的细粒度权限配置' })
  @ApiResponse({ status: 200, description: '保存成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  saveRolePermissions(
    @Param('roleId') roleId: string,
    @Body() dto: SaveRolePermissionsDto,
  ) {
    return this.fineGrainedPermissionService.saveRolePermissions(roleId, dto.permissionIds);
  }

  @Put(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新细粒度权限定义' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '权限不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFineGrainedPermissionDto,
  ) {
    return this.fineGrainedPermissionService.update(id, updateDto);
  }

  @Put(':id/disable')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '停用细粒度权限' })
  @ApiResponse({ status: 200, description: '停用成功' })
  @ApiResponse({ status: 404, description: '权限不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  disable(@Param('id') id: string) {
    return this.fineGrainedPermissionService.disable(id);
  }

  @Put(':id/enable')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '启用细粒度权限' })
  @ApiResponse({ status: 200, description: '启用成功' })
  @ApiResponse({ status: 404, description: '权限不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  enable(@Param('id') id: string) {
    return this.fineGrainedPermissionService.enable(id);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除细粒度权限定义' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '权限不存在' })
  @ApiResponse({ status: 409, description: '权限已被分配，无法删除' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  remove(@Param('id') id: string) {
    return this.fineGrainedPermissionService.remove(id);
  }
}
