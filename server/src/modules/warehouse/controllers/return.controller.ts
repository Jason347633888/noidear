import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ReturnService } from '../services/return.service';
import { CreateReturnDto, ApproveReturnDto } from '../dto/return.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('退料管理')
@Controller('api/v1/returns')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReturnController {
  constructor(private readonly returnService: ReturnService) {}

  @Post()
  @ApiOperation({ summary: '创建退料单' })
  @ApiResponse({ status: 201, description: '退料单创建成功' })
  create(@Body() dto: CreateReturnDto) {
    return this.returnService.create(dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: '审批退料单' })
  @ApiResponse({ status: 200, description: '审批成功' })
  @ApiResponse({ status: 404, description: '退料单不存在' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveReturnDto,
  ) {
    return this.returnService.approve(id, dto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '完成退料（库存变更）' })
  @ApiResponse({ status: 200, description: '退料完成' })
  @ApiResponse({ status: 400, description: '库存不足或状态错误' })
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.returnService.complete(id);
  }

  @Get()
  @ApiOperation({ summary: '查询退料单列表' })
  findAll() {
    return this.returnService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '查询退料单详情' })
  @ApiResponse({ status: 404, description: '退料单不存在' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.returnService.findOne(id);
  }
}
