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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { MaterialService } from './material.service';
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  QueryMaterialDto,
} from './dto/material.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../module-access/ownership-context';

@ApiTags('仓库-物料管理')
@ApiBearerAuth()
@ModuleKey('warehouse')
@Controller('warehouse/materials')
@UseGuards(JwtAuthGuard)
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '新增物料',
    description: `
业务语义：在系统中新增一条物料主数据记录，供后续入库、出库、配方关联使用。
前置条件：物料编码（code）在系统中唯一；categoryId 须已存在。
副作用：新增 Material 记录，状态默认为 ACTIVE。
例外情况：编码重复时抛出 409 ConflictException；categoryId 不存在时抛出 400。
    `.trim(),
  })
  create(@Body() createMaterialDto: CreateMaterialDto, @Ownership() ownership: OwnershipContext) {
    return this.materialService.createForOwnership(createMaterialDto, ownership);
  }

  @Get()
  @ApiOperation({
    summary: '查询物料列表',
    description: `
业务语义：分页查询物料主数据，支持按名称/编码模糊搜索（search）、按分类过滤（categoryId）、按状态过滤（status）。
前置条件：无特殊前置条件；search 为空时返回全量。
副作用：无，只读操作。
例外情况：categoryId 不存在时返回空列表，不报错。
    `.trim(),
  })
  findAll(@Query() query: QueryMaterialDto) {
    return this.materialService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取物料详情',
    description: `
业务语义：按 ID 获取单条物料主数据，包含分类信息及当前库存快照。
前置条件：物料 ID 必须存在。
副作用：无，只读操作。
例外情况：ID 不存在时抛出 404 NotFoundException。
    `.trim(),
  })
  @ApiParam({ name: 'id', description: '物料 ID' })
  findOne(@Param('id') id: string) {
    return this.materialService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新物料信息',
    description: `
业务语义：更新指定物料的名称、规格、单位、分类等基础信息，支持部分字段更新。
前置条件：物料 ID 必须存在；若修改 code，新编码不能与其他物料重复。
副作用：修改 Material 记录对应字段，同步更新 updatedAt。
例外情况：ID 不存在时抛出 404；编码冲突时抛出 409。
    `.trim(),
  })
  @ApiParam({ name: 'id', description: '物料 ID' })
  update(@Param('id') id: string, @Body() updateMaterialDto: UpdateMaterialDto) {
    return this.materialService.update(id, updateMaterialDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除物料',
    description: `
业务语义：软删除或硬删除指定物料记录；若该物料存在关联的库存或配方记录则拒绝删除。
前置条件：物料 ID 必须存在；物料不能有关联的有效库存批次或配方引用。
副作用：删除 Material 记录（或标记 status=INACTIVE）。
例外情况：ID 不存在时抛出 404；有关联数据时抛出 409 ConflictException。
    `.trim(),
  })
  @ApiParam({ name: 'id', description: '物料 ID' })
  remove(@Param('id') id: string) {
    return this.materialService.remove(id);
  }
}
