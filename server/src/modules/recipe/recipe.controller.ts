import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { RecipeService } from './recipe.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
  create(@Body() dto: CreateRecipeDto) {
    return this.service.create(dto);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
