import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

interface LdapUser {
  username: string;
  name: string;
  email?: string;
}

interface OAuthUser {
  provider: string;
  providerId: string;
  username: string;
  name: string;
  email?: string;
}

/**
 * SSO 单点登录服务
 * TASK-389: 支持 LDAP 和 OAuth2 登录
 */
@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * LDAP 登录（模拟实现，需配置真实 LDAP 服务器）
   */
  async ldapLogin(username: string, password: string) {
    if (!process.env.LDAP_URL) {
      throw new BadRequestException('LDAP 未配置，请联系管理员');
    }

    const ldapUser = await this.authenticateWithLdap(username, password);
    const user = await this.findOrCreateUser(ldapUser.username, ldapUser.name, 'ldap');
    const token = this.generateToken(user);

    return { token, user: { id: user.id, username: user.username, name: user.name, role: user.role } };
  }

  /**
   * OAuth2 回调处理（code 换 userInfo 的抽象层）
   * 实际项目中在此调用各 provider API 获取用户信息
   */
  async handleOAuth2Callback(provider: string, code: string, state?: string) {
    this.logger.log(`OAuth2 callback received: provider=${provider}`);
    // 抽象层：实际项目需要用 code 调用 provider API 获取用户信息
    const oauthUser = await this.fetchOAuthUserInfo(provider, code);
    return this.oauth2Login(oauthUser);
  }

  /**
   * OAuth2 登录处理
   */
  async oauth2Login(oauthUser: OAuthUser) {
    const username = `${oauthUser.provider}_${oauthUser.providerId}`;
    const user = await this.findOrCreateUser(username, oauthUser.name, oauthUser.provider);
    const token = this.generateToken(user);

    return { token, user: { id: user.id, username: user.username, name: user.name, role: user.role } };
  }

  /**
   * 获取 OAuth2 重定向 URL
   */
  getOAuth2RedirectUrl(provider: string): string {
    const providers: Record<string, string | undefined> = {
      google: process.env.GOOGLE_AUTH_URL,
      github: process.env.GITHUB_AUTH_URL,
      wechat: process.env.WECHAT_AUTH_URL,
    };

    const url = providers[provider];
    if (!url) throw new BadRequestException(`不支持的 OAuth2 提供商: ${provider}`);
    return url;
  }

  private async fetchOAuthUserInfo(provider: string, code: string): Promise<OAuthUser> {
    // 实际项目中调用 provider API 换取用户信息
    // 此处为抽象占位，需根据实际 provider SDK 实现
    this.logger.log(`获取 OAuth2 用户信息: provider=${provider}`);
    return {
      provider,
      providerId: `${provider}_${code.slice(0, 8)}`,
      username: `${provider}_user`,
      name: `${provider} 用户`,
    };
  }

  private async authenticateWithLdap(username: string, password: string): Promise<LdapUser> {
    // 实际项目中在此集成 ldapjs
    // 此处为抽象实现，验证 LDAP 配置存在
    this.logger.log(`LDAP 认证: ${username}`);
    if (!password || password.length < 3) {
      throw new UnauthorizedException('LDAP 认证失败：密码无效');
    }
    return { username, name: username };
  }

  private async findOrCreateUser(username: string, name: string, provider: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) return existing;

    // 首次登录自动创建账号（BR-SSO-1）
    const id = require('crypto').randomBytes(16).toString('hex');
    const defaultPassword = await bcrypt.hash(require('crypto').randomBytes(16).toString('hex'), 10);

    this.logger.log(`SSO 首次登录，创建用户: ${username} (provider: ${provider})`);

    return this.prisma.user.create({
      data: { id, username, name, password: defaultPassword, role: 'user', status: 'active' },
    });
  }

  private generateToken(user: any) {
    return this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
  }
}
