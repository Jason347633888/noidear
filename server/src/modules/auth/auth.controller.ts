import { Controller, Post, Body, UseGuards, Request, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthenticatedRequest } from './authenticated-user';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDTO) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(@Request() req: AuthenticatedRequest, @Body() dto: ChangePasswordDTO) {
    return this.authService.changePassword(req.user.userId, dto);
  }
}
