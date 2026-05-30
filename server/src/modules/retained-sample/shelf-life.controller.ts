import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { ShelfLifeService, CreateShelfLifeStudyInput } from './shelf-life.service';
import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class ListShelfLifeStudiesDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('shelf-life-studies')
export class ShelfLifeController {
  constructor(private readonly shelfLifeService: ShelfLifeService) {}

  @Post()
  create(@Body() body: CreateShelfLifeStudyInput, @Request() req: AuthenticatedRequest) {
    return this.shelfLifeService.createShelfLifeStudy({
      ...body,
      companyId: req.user.companyId,
    });
  }

  @Get()
  list(@Query() query: ListShelfLifeStudiesDto, @Request() req: AuthenticatedRequest) {
    return this.shelfLifeService.listShelfLifeStudies({
      companyId: req.user.companyId,
      page: query.page,
      limit: query.limit,
      productId: query.productId,
      status: query.status,
    });
  }
}
