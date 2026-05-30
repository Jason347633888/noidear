import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccessDeclarationController } from './access-declaration.controller';
import { AccessDeclarationService } from './access-declaration.service';

@Module({
  imports: [PrismaModule],
  controllers: [AccessDeclarationController],
  providers: [AccessDeclarationService],
  exports: [AccessDeclarationService],
})
export class AccessDeclarationModule {}
