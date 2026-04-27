import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  async login(@Body() dto: LoginDTO) {
    return this.authService.login(dto);
  }

  @Post('wechat/miniprogram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '微信小程序登录' })
  @ApiResponse({ status: 200, description: '登录成功，返回 JWT' })
  @ApiResponse({ status: 401, description: '微信登录失败或未绑定账号' })
  async wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.wechatMiniProgramLogin(dto.code);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '用户信息' })
  async getProfile(@Request() req: any) {
    return req.user;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '修改密码' })
  @ApiResponse({ status: 200, description: '密码修改成功' })
  @ApiResponse({ status: 400, description: '旧密码错误' })
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDTO) {
    return this.authService.changePassword(req.user.id, dto);
  }
}
