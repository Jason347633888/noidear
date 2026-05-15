import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  roleId?: string;
  name: string;
  companyId?: string;
  departmentId?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.companyId) {
      throw new InternalServerErrorException('JWT payload 缺少 companyId，认证上下文契约被破坏');
    }
    return {
      id: payload.sub,
      username: payload.username,
      roleCode: payload.role,
      roleId: payload.roleId ?? '',
      name: payload.name,
      companyId: payload.companyId,
      departmentId: payload.departmentId,
    };
  }
}
