import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { RecycleBinService } from './recycle-bin.service';
import { RecycleBinQueryDto, BatchOperationDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('recycle-bin')
@UseGuards(JwtAuthGuard)
export class RecycleBinController {
  constructor(private readonly service: RecycleBinService) {}

  @Get(':type')
  async findAll(
    @Param('type') type: 'document' | 'template' | 'task',
    @Query() query: RecycleBinQueryDto,
    @Req() req: any,
  ) {
    return this.service.findAll(
      type,
      query.page ?? 1,
      query.limit ?? 10,
      query.keyword,
      req.user.id,
      req.user.role,
    );
  }

  @Post(':type/batch-restore')
  async batchRestore(
    @Param('type') type: 'document' | 'template' | 'task',
    @Body() dto: BatchOperationDto,
    @Req() req: any,
  ) {
    await this.service.batchRestore(type, dto.ids, req.user.id, req.user.role);
    return { success: true, message: `成功恢复 ${dto.ids.length} 项` };
  }

  @Delete(':type/batch-delete')
  async batchPermanentDelete(
    @Param('type') type: 'document' | 'template' | 'task',
    @Body() dto: BatchOperationDto,
    @Req() req: any,
  ) {
    await this.service.batchPermanentDelete(type, dto.ids, req.user.id, req.user.role);
    return { success: true, message: `成功删除 ${dto.ids.length} 项` };
  }

  @Post(':type/:id/restore')
  async restore(
    @Param('type') type: 'document' | 'template' | 'task',
    @Param('id') id: string,
    @Req() req: any,
  ) {
    await this.service.restore(type, id, req.user.id, req.user.role);
    return { success: true, message: '恢复成功' };
  }

  @Delete(':type/:id')
  async permanentDelete(
    @Param('type') type: 'document' | 'template' | 'task',
    @Param('id') id: string,
    @Req() req: any,
  ) {
    await this.service.permanentDelete(type, id, req.user.id, req.user.role);
    return { success: true, message: '永久删除成功' };
  }
}
