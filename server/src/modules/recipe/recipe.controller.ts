import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, ForbiddenException, Get, Post, Body, Param, Delete, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { RecipeService } from './recipe.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../module-access/ownership-context';

@ModuleKey('product_rd')
@Controller('recipes')
@UseGuards(JwtAuthGuard)
export class RecipeController {
  constructor(private service: RecipeService) {}

  @Get()
  findAll(@Query('archive') archive?: string) {
    return this.service.findAll(archive === 'true');
  }

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string, @Query('archive') archive?: string) {
    return this.service.findByProduct(productId, archive === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRecipeDto, @Ownership() ownership: OwnershipContext) {
    return this.service.createForOwnership(dto, ownership);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id') id: string, @Ownership() ownership: OwnershipContext) {
    if (ownership.roleCode !== 'admin') throw new ForbiddenException('仅管理员可归档配方主数据');
    return this.service.archive(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Ownership() ownership: OwnershipContext) {
    if (ownership.roleCode !== 'admin') throw new ForbiddenException('仅管理员可删除配方主数据');
    return this.service.remove(id);
  }
}
