import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('用户管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @ApiOperation({ summary: '用户列表' })
  async findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.userService.findAll(Number(page) || 1, Number(limit) || 20, keyword);
  }

  @Get(':id')
  @ApiOperation({ summary: '用户详情' })
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建用户' })
  async create(@Body() dto: CreateUserDTO) {
    return this.userService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用户' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDTO) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: '重置用户密码' })
  async resetPassword(@Param('id') id: string) {
    return this.userService.resetPassword(id);
  }
}
