import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@ApiTags('全文搜索')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Post('index/:documentId')
  @ApiOperation({ summary: '索引文档内容' })
  async indexDocument(@Param('documentId') documentId: string) {
    return this.service.indexDocument(documentId);
  }

  @Get('query')
  @ApiOperation({ summary: '全文搜索' })
  async search(@Query() query: SearchQueryDto) {
    return this.service.search(query);
  }

  @Delete('index/:documentId')
  @ApiOperation({ summary: '删除文档索引' })
  async deleteIndex(@Param('documentId') documentId: string) {
    return this.service.deleteIndex(documentId);
  }
}
