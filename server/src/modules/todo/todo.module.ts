import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';
import { TodoScheduleService } from './todo.schedule';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [TodoController],
  providers: [TodoService, TodoScheduleService],
  exports: [TodoService],
})
export class TodoModule {}
