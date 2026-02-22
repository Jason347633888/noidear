import { Controller, Post, Get, Body, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { SsoService } from './sso.service';

const ALLOWED_PROVIDERS = ['google', 'github', 'wechat'];

class LdapLoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}

@ApiTags('SSO 单点登录')
@Controller('api/v1/auth/sso')
export class SsoController {
  constructor(private readonly ssoService: SsoService) {}

  @Post('ldap')
  @ApiOperation({ summary: 'LDAP 登录' })
  async ldapLogin(@Body() body: LdapLoginDto) {
    if (!body.username || !body.password) {
      throw new BadRequestException('用户名和密码不能为空');
    }
    return this.ssoService.ldapLogin(body.username, body.password);
  }

  @Get('oauth2/redirect')
  @ApiOperation({ summary: 'OAuth2 重定向（获取认证 URL）' })
  @ApiQuery({ name: 'provider', enum: ALLOWED_PROVIDERS })
  async oauth2Redirect(@Query('provider') provider: string) {
    this.assertValidProvider(provider);
    return { redirectUrl: this.ssoService.getOAuth2RedirectUrl(provider) };
  }

  @Get('oauth2/callback')
  @ApiOperation({ summary: 'OAuth2 回调处理（由 provider 跳转调用）' })
  async oauth2Callback(
    @Query('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state?: string,
  ) {
    this.assertValidProvider(provider);
    if (!code) throw new BadRequestException('code 参数不能为空');
    return this.ssoService.handleOAuth2Callback(provider, code, state);
  }

  private assertValidProvider(provider: string) {
    if (!provider) throw new BadRequestException('provider 参数不能为空');
    if (!ALLOWED_PROVIDERS.includes(provider)) {
      throw new BadRequestException(`不支持的 provider，允许值：${ALLOWED_PROVIDERS.join(', ')}`);
    }
  }
}
