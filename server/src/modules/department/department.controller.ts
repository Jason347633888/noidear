import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDepartmentDTO } from './dto/create-department.dto';
import { UpdateDepartmentDTO } from './dto/update-department.dto';

@ApiTags('部门管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  @ApiOperation({ summary: '获取部门列表' })
  async findAll(@Query('limit') limit?: number) {
    return this.departmentService.findAll(limit || 100);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取部门详情' })
  async findOne(@Param('id') id: string) {
    return this.departmentService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建部门' })
  async create(@Body() dto: CreateDepartmentDTO) {
    return this.departmentService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新部门' })
  async update(@Param('id') id: string, @Body() dto: UpdateDepartmentDTO) {
    return this.departmentService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除部门' })
  async remove(@Param('id') id: string) {
    return this.departmentService.remove(id);
  }
}
