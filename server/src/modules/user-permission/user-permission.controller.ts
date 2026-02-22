import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserPermissionService } from './user-permission.service';
import {
  GrantPermissionDto,
  BatchGrantPermissionDto,
  QueryUserPermissionDto,
  BatchGrantMultipleUsersDto,
  BatchRevokePermissionsDto,
} from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('用户权限管理')
@Controller('user-permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserPermissionController {
  constructor(private readonly userPermissionService: UserPermissionService) {}

  @Post('grant')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '授予权限给用户' })
  @ApiResponse({ status: 201, description: '授予成功' })
  @ApiResponse({ status: 404, description: '用户或权限不存在' })
  @ApiResponse({ status: 409, description: '权限已存在' })
  grantPermission(@Body() grantDto: GrantPermissionDto, @Request() req: any) {
    return this.userPermissionService.grantPermission({
      ...grantDto,
      grantedBy: req.user.id,
    });
  }

  @Delete(':id/revoke')
  @Roles('admin', 'leader')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '撤销用户权限' })
  @ApiResponse({ status: 200, description: '撤销成功' })
  @ApiResponse({ status: 404, description: '权限记录不存在' })
  @ApiResponse({ status: 403, description: '仅原授权人或管理员可撤销' })
  revokePermission(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.userPermissionService.revokePermission(id, req.user.id);
  }

  @Post('batch-grant')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '批量授予权限' })
  @ApiResponse({ status: 201, description: '批量授予成功' })
  @ApiResponse({ status: 404, description: '用户或权限不存在' })
  batchGrantPermissions(
    @Body() batchDto: BatchGrantPermissionDto,
    @Request() req: any,
  ) {
    return this.userPermissionService.batchGrantPermissions({
      ...batchDto,
      grantedBy: req.user.id,
    });
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: '查询用户权限列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findUserPermissions(@Query() query: QueryUserPermissionDto) {
    return this.userPermissionService.findUserPermissions(query);
  }

  @Post('check-expiration')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '检查并移除过期权限' })
  @ApiResponse({ status: 200, description: '检查完成' })
  checkExpiration() {
    return this.userPermissionService.checkExpiration();
  }

  @Post('batch-grant-multiple-users')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '批量授予权限给多个用户' })
  @ApiResponse({ status: 201, description: '批量授予成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  batchGrantMultipleUsers(
    @Body() batchDto: BatchGrantMultipleUsersDto,
    @Request() req: any,
  ) {
    return this.userPermissionService.batchGrantMultipleUsers({
      ...batchDto,
      grantedBy: req.user.id,
    });
  }

  @Post('batch-revoke')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量撤销权限' })
  @ApiResponse({ status: 200, description: '批量撤销成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  batchRevokePermissions(@Body() batchDto: BatchRevokePermissionsDto) {
    return this.userPermissionService.batchRevokePermissions(batchDto);
  }

  /**
   * 获取用户的有效权限（直接授予，含过期检查）
   * BR-358: 权限继承规则
   */
  @Get(':userId/effective')
  @Roles('admin', 'leader')
  @ApiOperation({ summary: '获取用户有效权限列表（含继承）' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  getEffectivePermissions(@Param('userId') userId: string) {
    return this.userPermissionService.getEffectivePermissionsForApi(userId);
  }

  /**
   * 检查用户是否拥有指定权限
   * BR-354: 权限检查规则
   */
  @Get(':userId/has-permission')
  @Roles('admin', 'leader')
  @ApiOperation({ summary: '检查用户是否拥有指定权限' })
  @ApiResponse({ status: 200, description: '检查结果' })
  async hasPermission(
    @Param('userId') userId: string,
    @Query('permissionCode') permissionCode: string,
  ) {
    if (!permissionCode) {
      return { success: false, error: 'permissionCode 为必填参数' };
    }
    const result = await this.userPermissionService.hasPermission(userId, permissionCode);
    return { success: true, data: { userId, permissionCode, hasPermission: result } };
  }
}
