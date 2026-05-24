import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RecordTaskInstanceService } from './record-task-instance.service';
import { ModuleKey } from '../../shared/decorators/module-key.decorator';

@ModuleKey('work_execution')
@ApiTags('任务实例')
@Controller('record-task-instances')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RecordTaskInstanceController {
  constructor(private readonly instanceService: RecordTaskInstanceService) {}

  @Get('pending')
  @ApiOperation({ summary: '员工查看本部门待填实例' })
  findPending(@Req() req: any, @Query() query: { page?: string; limit?: string }) {
    return this.instanceService.findPending(
      req.user.id,
      query.page ? Number(query.page) : 1,
      query.limit ? Number(query.limit) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '任务实例详情' })
  findInstance(@Param('id') id: string) {
    return this.instanceService.findOne(id);
  }
}
