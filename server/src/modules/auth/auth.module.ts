import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './auth.strategy';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    HttpModule,
    ConfigModule,
    JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } }),
  ],
  controllers: [AuthController, SsoController],
  providers: [AuthService, JwtStrategy, SsoService],
  exports: [AuthService, SsoService],
})
export class AuthModule {}
