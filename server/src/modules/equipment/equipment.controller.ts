import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EquipmentService } from './equipment.service';
import {
  CreateEquipmentDto,
  UpdateEquipmentDto,
  UpdateEquipmentStatusDto,
  QueryEquipmentDto,
} from './dto/equipment.dto';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../module-access/ownership-context';

@UseGuards(JwtAuthGuard)
@ModuleKey('equipment_site')
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEquipmentDto, @Request() req: any) {
    return this.equipmentService.create(dto, req?.user?.id);
  }

  @Get()
  findAll(@Query() query: QueryEquipmentDto, @Ownership() ownership: OwnershipContext) {
    return this.equipmentService.findAll(query, ownership);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentDto,
    @Ownership() ownership: OwnershipContext,
  ) {
    await this.equipmentService.assertOwnership(id, ownership);
    return this.equipmentService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Ownership() ownership: OwnershipContext) {
    await this.equipmentService.assertOwnership(id, ownership);
    return this.equipmentService.remove(id);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentStatusDto,
    @Ownership() ownership: OwnershipContext,
  ) {
    await this.equipmentService.assertOwnership(id, ownership);
    return this.equipmentService.updateStatus(id, dto);
  }
}
