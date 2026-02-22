import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecommendationService } from './recommendation.service';
import { TrackViewDto } from './dto/track-view.dto';

@ApiTags('智能文档推荐')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/recommendations')
export class RecommendationController {
  constructor(private readonly service: RecommendationService) {}

  @Post('track')
  @ApiOperation({ summary: '记录用户访问行为' })
  async track(@Request() req: { user: { sub: string } }, @Body() dto: TrackViewDto) {
    return this.service.trackView(req.user.sub, dto);
  }

  @Get('my')
  @ApiOperation({ summary: '获取我的推荐文档' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyRecommendations(@Request() req: { user: { sub: string } }, @Query('limit') limit?: number) {
    return this.service.getMyRecommendations(req.user.sub, limit ? +limit : 10);
  }

  @Post('generate')
  @ApiOperation({ summary: '手动触发批量生成推荐（管理员）' })
  async generate() {
    return this.service.triggerGeneration();
  }
}
