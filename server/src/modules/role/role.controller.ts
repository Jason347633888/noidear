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
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('角色管理')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建角色' })
  @ApiResponse({ status: 201, description: '角色创建成功' })
  @ApiResponse({ status: 409, description: '角色代码已存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: '查询角色列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  findAll(@Query() query: QueryRoleDto) {
    return this.roleService.findAll(query);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: '查询角色详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Put(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新角色' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除角色' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({ status: 400, description: '角色正在被使用，无法删除' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  remove(@Param('id') id: string) {
    return this.roleService.remove(id);
  }

  @Post(':id/permissions')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量分配权限' })
  @ApiResponse({ status: 200, description: '权限分配成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({ status: 400, description: '部分权限ID不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionsDto) {
    return this.roleService.assignPermissions(id, dto);
  }

  @Delete(':id/permissions/:permissionId')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '撤销权限' })
  @ApiResponse({ status: 200, description: '权限撤销成功' })
  @ApiResponse({ status: 404, description: '角色或权限不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  revokePermission(@Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.roleService.revokePermission(id, permissionId);
  }

  @Get(':id/permissions')
  @Roles('admin')
  @ApiOperation({ summary: '查询角色权限列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  getRolePermissions(@Param('id') id: string) {
    return this.roleService.getRolePermissions(id);
  }
}
