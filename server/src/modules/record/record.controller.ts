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
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RecordService } from './record.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { QueryRecordDto } from './dto/query-record.dto';
import { QueryChangeLogDto } from './dto/query-change-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChangeLogInterceptor } from './interceptors/change-log.interceptor';
import { TimestampValidationInterceptor } from '../../common/interceptors/timestamp-validation.interceptor';

@ApiTags('记录管理')
@Controller('records')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建记录实例' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  @ApiResponse({ status: 400, description: '数据验证失败' })
  create(@Body() createDto: CreateRecordDto, @Req() req: any) {
    return this.recordService.create(createDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: '查询记录列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Query() query: QueryRecordDto) {
    return this.recordService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询记录详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  findOne(@Param('id') id: string) {
    return this.recordService.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(ChangeLogInterceptor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新记录' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  @ApiResponse({ status: 400, description: '数据验证失败' })
  update(@Param('id') id: string, @Body() updateDto: UpdateRecordDto, @Req() req: any) {
    return this.recordService.update(id, updateDto, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除记录（软删除）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  remove(@Param('id') id: string) {
    return this.recordService.remove(id);
  }

  @Get(':id/change-logs')
  @ApiOperation({ summary: '查询记录变更历史' })
  @ApiResponse({ status: 200, description: '查询成功' })
  getChangeLogs(@Param('id') id: string, @Query() query: QueryChangeLogDto) {
    return this.recordService.getChangeLogs(id, query);
  }

  /**
   * P0-3: 提交记录审批
   * P0-4: 时间戳校验拦截器（BRCGS 合规）
   */
  @Post(':id/submit')
  @UseInterceptors(TimestampValidationInterceptor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '提交记录审批' })
  @ApiResponse({ status: 200, description: '提交成功' })
  @ApiResponse({ status: 400, description: '状态不允许提交' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  submit(@Param('id') id: string, @Req() req: any) {
    return this.recordService.submit(id, req.user.userId);
  }

  /**
   * P0-5: 电子签名（BRCGS 合规）
   */
  @Post(':id/signature')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '电子签名（BRCGS 合规）' })
  @ApiResponse({ status: 200, description: '签名成功' })
  @ApiResponse({ status: 400, description: '状态不允许签名或密码错误' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  async signRecord(
    @Param('id') id: string,
    @Body() body: { password: string; comment?: string },
    @Req() req: any,
  ) {
    if (!body.password) {
      throw new BadRequestException('电子签名需要密码验证');
    }
    return this.recordService.signRecord(id, req.user.userId, body);
  }

  /**
   * P1-16: 修改已审批记录
   */
  @Put(':id/approved')
  @UseInterceptors(ChangeLogInterceptor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '修改已审批记录（需变更原因）' })
  @ApiResponse({ status: 200, description: '修改成功' })
  @ApiResponse({ status: 400, description: '缺少变更原因' })
  updateApproved(
    @Param('id') id: string,
    @Body() body: { dataJson?: any; reason: string },
    @Req() req: any,
  ) {
    if (!body.reason || body.reason.length < 10) {
      throw new BadRequestException('变更原因至少 10 个字符');
    }
    return this.recordService.updateApproved(id, { dataJson: body.dataJson }, req.user.userId, body.reason);
  }

  /**
   * P1-16: 查询记录保留期限
   */
  @Get(':id/retention')
  @ApiOperation({ summary: '查询记录保留期限' })
  @ApiResponse({ status: 200, description: '查询成功' })
  getRetentionInfo(@Param('id') id: string) {
    return this.recordService.getRetentionInfo(id);
  }
}
