import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentPermissionService } from './department-permission.service';
import {
  CheckDepartmentAccessDto,
  QueryAccessibleDepartmentsDto,
} from './dto/department-permission.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * 部门级权限隔离 API
 *
 * 业务规则：
 * - BR-356: 部门边界规则
 * - BR-357: 跨部门权限验证规则
 */
@ApiTags('部门权限隔离')
@Controller('department-permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DepartmentPermissionController {
  constructor(
    private readonly departmentPermissionService: DepartmentPermissionService,
  ) {}

  /**
   * 检查用户是否有权访问指定部门的资源
   * BR-356: 部门边界规则
   */
  @Post('check-access')
  @Roles('admin', 'leader')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '检查用户对指定部门资源的访问权限' })
  @ApiResponse({ status: 200, description: '检查结果' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  async checkAccess(@Body() dto: CheckDepartmentAccessDto) {
    const hasAccess = await this.departmentPermissionService.canAccessDepartmentResource(
      dto.userId,
      dto.departmentId,
      dto.action,
      dto.resourceType,
    );

    return {
      success: true,
      data: {
        userId: dto.userId,
        departmentId: dto.departmentId,
        action: dto.action,
        resourceType: dto.resourceType,
        hasAccess,
      },
    };
  }

  /**
   * 检查用户是否有跨部门权限
   * BR-357: 跨部门权限验证规则
   */
  @Get('cross-department')
  @Roles('admin', 'leader')
  @ApiOperation({ summary: '检查用户是否拥有跨部门权限' })
  @ApiResponse({ status: 200, description: '检查结果' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async checkCrossDepartment(
    @Query('userId') userId: string,
    @Query('permissionCode') permissionCode: string,
  ) {
    if (!userId || !permissionCode) {
      throw new BadRequestException('userId 和 permissionCode 均为必填参数');
    }

    const hasPermission = await this.departmentPermissionService.hasCrossDepartmentPermission(
      userId,
      permissionCode,
    );

    return {
      success: true,
      data: { userId, permissionCode, hasPermission },
    };
  }

  /**
   * 获取用户可访问的部门列表
   * BR-356: 部门边界规则
   */
  @Get('accessible-departments')
  @Roles('admin', 'leader')
  @ApiOperation({ summary: '获取用户可访问的部门列表' })
  @ApiResponse({ status: 200, description: '可访问的部门 ID 列表' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async getAccessibleDepartments(@Query() query: QueryAccessibleDepartmentsDto) {
    if (!query.userId) {
      throw new BadRequestException('userId 为必填参数');
    }

    const resourceType = query.resourceType || 'document';
    const departmentIds = await this.departmentPermissionService.getAccessibleDepartments(
      query.userId,
      resourceType,
    );

    return {
      success: true,
      data: {
        userId: query.userId,
        resourceType,
        departmentIds,
        count: departmentIds.length,
      },
    };
  }
}
