import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { DocumentModule } from './modules/document/document.module';
import { TemplateModule } from './modules/template/template.module';

@Module({
  imports: [PrismaModule, AuthModule, UserModule, DocumentModule, TemplateModule],
})
export class AppModule {}
