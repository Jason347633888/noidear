import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StagingAreaService } from './staging-area.service';
import { StageMaterialToAreaDto, ConfirmStocktakeDto } from './dto/staging-area.dto';

@UseGuards(JwtAuthGuard)
@ModuleKey('warehouse')
@Controller('warehouse/staging-area')
export class StagingAreaController {
  constructor(private readonly stagingAreaService: StagingAreaService) {}

  @Get('stock')
  getStock(@Query() query: any) {
    if (query.areaId && query.materialId) {
      return this.stagingAreaService.listAvailableStocks({ areaId: query.areaId, materialId: query.materialId });
    }
    return this.stagingAreaService.getCurrentStock(query);
  }

  @Post('stage')
  @HttpCode(HttpStatus.CREATED)
  stageToZone(@Body() dto: any, @Request() req: any) {
    return this.stagingAreaService.stageToZone({ ...dto, operatorId: req.user.id });
  }

  @Post('transfer')
  @HttpCode(HttpStatus.CREATED)
  transferZone(@Body() dto: any, @Request() req: any) {
    return this.stagingAreaService.transferZone({ ...dto, operatorId: req.user.id });
  }

  @Post(':id/dispense')
  @HttpCode(HttpStatus.OK)
  dispense(@Param('id') id: string, @Body() body: { quantity: number }, @Request() req: any) {
    return this.stagingAreaService.dispenseFromZone(id, body.quantity, req.user.id);
  }

  @Get('transfer-logs')
  getTransferLogs(@Query('batchId') batchId?: string) {
    return this.stagingAreaService.getTransferLogs(batchId);
  }

  @Post('inventory')
  @HttpCode(HttpStatus.CREATED)
  recordInventory(@Body() recordDto: any) {
    return this.stagingAreaService.recordInventory(recordDto);
  }

  @Get('inventory/:batchId')
  getInventoryHistory(@Param('batchId') batchId: string) {
    return this.stagingAreaService.getInventoryHistory(batchId);
  }

  @Post('stage-to-area')
  @HttpCode(HttpStatus.CREATED)
  stageToArea(@Body() dto: StageMaterialToAreaDto) {
    return this.stagingAreaService.stageToArea(dto);
  }

  @Post('stocktakes')
  @HttpCode(HttpStatus.CREATED)
  confirmStocktake(@Body() dto: ConfirmStocktakeDto) {
    return this.stagingAreaService.confirmStocktake(dto);
  }
}
