import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDTO } from './dto/login.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';

interface AuthTokenPayload {
  sub: string;
  username: string;
  role: string;
  roleId?: string;
  name: string;
  companyId?: string;
  departmentId?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDTO) {
    const lockoutDisabled = process.env.AUTH_LOCKOUT_DISABLED === 'true';
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: { roleObj: true },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }

    if (!lockoutDisabled && user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new UnauthorizedException('账号已被锁定');
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      if (!lockoutDisabled) {
        await this.handleFailedLogin(user.id);
      }
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 登录成功：重置失败计数
    await this.prisma.user.update({
      where: { id: user.id },
      data:  { loginAttempts: 0, firstFailedAt: null, lockedUntil: null },
    });

    const roleCode = user.roleObj?.code;
    if (!roleCode) {
      throw new UnauthorizedException('用户缺少正式角色');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: roleCode,
      roleId: user.roleId,
      name: user.name,
      companyId: user.company_id,
      departmentId: user.departmentId,
    };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: roleCode,
        roleId: user.roleId,
        companyId: user.company_id,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDTO) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    const isValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('旧密码错误');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: '密码修改成功' };
  }

  validateUser(payload: AuthTokenPayload) {
    return {
      id: payload.sub,
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      roleId: payload.roleId ?? '',
      name: payload.name,
      companyId: payload.companyId ?? '1',
      departmentId: payload.departmentId,
    };
  }

  generateToken(payload: AuthTokenPayload) {
    return this.jwtService.sign(payload);
  }

  private async handleFailedLogin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const now = new Date();
    const windowMs = 5 * 60 * 1000; // 5 分钟窗口

    // 若超过 5 分钟或从未记录，重新开始计数
    const withinWindow =
      user?.firstFailedAt && now.getTime() - new Date(user.firstFailedAt).getTime() < windowMs;

    const attempts = withinWindow ? (user?.loginAttempts || 0) + 1 : 1;
    const firstFailedAt = (withinWindow && user?.firstFailedAt) ? user.firstFailedAt : now;

    const update: { loginAttempts: number; firstFailedAt: Date; lockedUntil?: Date } = {
      loginAttempts: attempts,
      firstFailedAt,
    };

    if (attempts >= 5) {
      update.lockedUntil = new Date(now.getTime() + 1 * 60 * 1000); // 锁定 1 分钟
    }

    await this.prisma.user.update({ where: { id: userId }, data: update });
  }
}
