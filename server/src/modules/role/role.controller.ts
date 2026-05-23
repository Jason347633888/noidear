import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { QueryRoleDto } from './dto/query-role.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('角色管理')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

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
}
