import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { RecipeService } from './recipe.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('recipes')
@UseGuards(JwtAuthGuard)
export class RecipeController {
  constructor(private service: RecipeService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.service.findByProduct(productId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRecipeDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
