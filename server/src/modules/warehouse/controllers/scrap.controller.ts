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
import { ScrapService } from '../services/scrap.service';
import { CreateScrapDto, ApproveScrapDto } from '../dto/scrap.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('报废管理')
@Controller('api/v1/scraps')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ScrapController {
  constructor(private readonly scrapService: ScrapService) {}

  @Post()
  @ApiOperation({ summary: '创建报废单' })
  @ApiResponse({ status: 201, description: '报废单创建成功' })
  create(@Body() dto: CreateScrapDto) {
    return this.scrapService.create(dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: '审批报废单' })
  @ApiResponse({ status: 200, description: '审批成功' })
  @ApiResponse({ status: 404, description: '报废单不存在' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveScrapDto,
  ) {
    return this.scrapService.approve(id, dto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '完成报废（库存变更）' })
  @ApiResponse({ status: 200, description: '报废完成' })
  @ApiResponse({ status: 400, description: '库存不足或状态错误' })
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.scrapService.complete(id);
  }

  @Get()
  @ApiOperation({ summary: '查询报废单列表' })
  findAll() {
    return this.scrapService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '查询报废单详情' })
  @ApiResponse({ status: 404, description: '报废单不存在' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.scrapService.findOne(id);
  }
}
