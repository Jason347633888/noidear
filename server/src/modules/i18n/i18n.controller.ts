import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { I18nService } from './i18n.service';

@ApiTags('多语言支持')
@Controller('i18n')
export class I18nController {
  constructor(private readonly service: I18nService) {}

  @Get('locales')
  @ApiOperation({ summary: '获取支持的语言列表' })
  getSupportedLocales() {
    return this.service.getSupportedLocales();
  }

  @Get('translations/:locale')
  @ApiOperation({ summary: '获取翻译文件' })
  async getTranslations(@Param('locale') locale: string) {
    return this.service.getTranslations(locale);
  }

  @Post('translations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '更新翻译文件（管理员）' })
  async updateTranslations(@Body() body: { locale: string; translations: Record<string, unknown> }) {
    return this.service.updateTranslations(body.locale, body.translations);
  }
}
