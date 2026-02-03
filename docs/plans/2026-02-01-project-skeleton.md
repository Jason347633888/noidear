# 项目骨架搭建 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 创建完整的项目骨架，包括前端 Vue 3 + Element Plus 项目和后端 NestJS 项目，实现基础认证和 API 封装。

**Architecture:**
- 前端：Vue 3 + Vite + TypeScript + Pinia + Vue Router + Axios
- 后端：NestJS + TypeScript + Prisma + JWT + Swagger
- Monorepo 结构：client/ 和 server/ 独立项目，packages/types 共享类型

**Tech Stack:**
- 前端：Vue 3.4.x, Element Plus 2.5.x, Vite 5.x, Pinia 2.1.x, Axios 1.6.x
- 后端：NestJS 10.x, Node.js 18.x, Prisma 5.7.x, bcrypt 5.1.x, jsonwebtoken 9.0.x
- 开发工具：Antfu ESLint Config, TypeScript 5.3.x

---

## 基础设施文件

### 环境变量
- Create: `.env` - 实际环境变量（开发环境）
- Modify: `.env.example` - 已存在，添加缺失变量

---

## 后端项目 (server/)

### Task 1: 初始化 NestJS 项目

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/main.ts`
- Create: `server/src/app.module.ts`

**Step 1: 创建 package.json**

```json
{
  "name": "noidear-server",
  "version": "1.0.0",
  "description": "Document Management System Backend",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/swagger": "^7.1.0",
    "@prisma/client": "^5.7.0",
    "bcrypt": "^5.1.0",
    "class-transformer": "^0.5.0",
    "class-validator": "^0.14.0",
    "jsonwebtoken": "^9.0.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/express": "^4.17.17",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/node": "^20.3.1",
    "@types/passport-jwt": "^4.0.1",
    "prisma": "^5.7.0",
    "typescript": "^5.3.0"
  }
}
```

**Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: 创建 main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局前缀
  app.setGlobalPrefix('api/v1');

  // 验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('文档管理系统 API')
    .setDescription('Document Management System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
  console.log(`API Docs: http://localhost:${port}/api/docs`);
}
bootstrap();
```

**Step 4: 创建 app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, UserModule],
})
export class AppModule {}
```

**Step 5: Commit**

```bash
git add server/package.json server/tsconfig.json server/src/main.ts server/src/app.module.ts
git commit -m "feat: 初始化 NestJS 项目骨架"
```

---

### Task 2: Prisma 模块

**Files:**
- Create: `server/src/prisma/prisma.module.ts`
- Create: `server/src/prisma/prisma.service.ts`
- Create: `server/src/prisma/schema.prisma`

**Step 1: 创建 prisma.service.ts**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**Step 2: 创建 prisma.module.ts**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**Step 3: 创建 schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  username      String    @unique
  password      String
  name          String
  departmentId  String?
  role          String    @default("user")
  superiorId    String?
  status        String    @default("active")
  loginAttempts Int       @default(0)
  lockedUntil   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  @@map("users")
}

model Department {
  id        String    @id @default(cuid())
  code      String    @unique
  name      String
  parentId  String?
  status    String    @default("active")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@map("departments")
}

model NumberRule {
  id           String   @id @default(cuid())
  level        Int
  departmentId String
  sequence     Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([level, departmentId])
  @@map("number_rules")
}

model Document {
  id          String    @id @default(cuid())
  level       Int
  number      String    @unique
  title       String
  filePath    String
  fileName    String
  fileSize    BigInt
  fileType    String
  version     Float     @default(1.0)
  status      String
  creatorId   String
  approverId  String?
  approvedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@map("documents")
}

model DocumentVersion {
  id          String   @id @default(cuid())
  documentId  String
  version     Float
  filePath    String
  fileName    String
  fileSize    BigInt
  creatorId   String
  createdAt   DateTime @default(now())

  @@map("document_versions")
}

model Template {
  id        String   @id @default(cuid())
  level     Int      @default(4)
  number    String   @unique
  title     String
  fieldsJson Json
  version   Float    @default(1.0)
  status    String   @default("active")
  creatorId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  @@map("templates")
}

model Task {
  id           String    @id @default(cuid())
  templateId   String
  departmentId String
  deadline     DateTime
  status       String    @default("pending")
  creatorId    String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  @@map("tasks")
}

model TaskRecord {
  id          String    @id @default(cuid())
  taskId      String
  templateId  String
  dataJson    Json
  status      String    @default("pending")
  submitterId String?
  submittedAt DateTime?
  approverId  String?
  approvedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@map("task_records")
}

model Approval {
  id         String   @id @default(cuid())
  documentId String
  recordId   String?
  approverId String
  status     String
  comment    String?
  createdAt  DateTime @default(now())

  @@map("approvals")
}

model OperationLog {
  id         String   @id @default(cuid())
  userId     String
  action     String
  module     String
  objectId   String
  objectType String
  details    Json?
  ip         String
  createdAt  DateTime @default(now())

  @@map("operation_logs")
}

model Notification {
  id        String    @id @default(cuid())
  userId    String
  type      String
  title     String
  content   String?
  isRead    Boolean   @default(false)
  readAt    DateTime?
  createdAt DateTime  @default(now())

  @@map("notifications")
}
```

**Step 4: 创建 .env**

```env
DATABASE_URL=postgresql://noidear:noidear123@localhost:5432/document_system
JWT_SECRET=noidear123
JWT_EXPIRES_IN=7d
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=noidear123
MINIO_BUCKET=noidear-documents
PORT=3000
NODE_ENV=development
```

**Step 5: Commit**

```bash
git add server/src/prisma/ server/.env
git commit -m "feat: 添加 Prisma 模块和数据库 Schema"
```

---

### Task 3: Auth 模块

**Files:**
- Create: `server/src/modules/auth/auth.module.ts`
- Create: `server/src/modules/auth/auth.controller.ts`
- Create: `server/src/modules/auth/auth.service.ts`
- Create: `server/src/modules/auth/auth.strategy.ts`
- Create: `server/src/modules/auth/dto/login.dto.ts`

**Step 1: 创建 login.dto.ts**

```typescript
import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDTO {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(8)
  password: string;
}
```

**Step 2: 创建 auth.service.ts**

```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDTO } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDTO) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new UnauthorizedException('账号已被锁定');
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      await this.handleFailedLogin(user.id);
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = this.jwtService.sign(payload);

    return { token, user: { id: user.id, username: user.username, name: user.name, role: user.role } };
  }

  private async handleFailedLogin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const attempts = (user?.loginAttempts || 0) + 1;
    const update: { loginAttempts: number; lockedUntil?: Date } = { loginAttempts: attempts };
    if (attempts >= 5) {
      update.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    }
    await this.prisma.user.update({ where: { id: userId }, data: update });
  }
}
```

**Step 3: 创建 auth.controller.ts**

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';

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
}
```

**Step 4: 创建 auth.strategy.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; username: string; role: string }) {
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}
```

**Step 5: 创建 auth.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './auth.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

**Step 6: Commit**

```bash
git add server/src/modules/auth/
git commit -m "feat: 添加认证模块（登录、JWT）"
```

---

### Task 4: User 模块（基础 CRUD）

**Files:**
- Create: `server/src/modules/user/user.module.ts`
- Create: `server/src/modules/user/user.controller.ts`
- Create: `server/src/modules/user/user.service.ts`
- Create: `server/src/modules/user/dto/create-user.dto.ts`
- Create: `server/src/modules/user/dto/update-user.dto.ts`

**Step 1: 创建 user.service.ts**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, keyword?: string) {
    const where = keyword ? { OR: [{ name: { contains: keyword } }, { username: { contains: keyword } }] } : {};
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);
    return { list, total, page, limit };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async create(dto: CreateUserDTO) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { ...dto, password: hashedPassword },
    });
  }

  async update(id: string, dto: UpdateUserDTO) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
```

**Step 2: 创建 user.controller.ts**

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('用户管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @ApiOperation({ summary: '用户列表' })
  async findAll(@Query('page') page: number, @Query('limit') limit: number, @Query('keyword') keyword?: string) {
    return this.userService.findAll(page, limit, keyword);
  }

  @Get(':id')
  @ApiOperation({ summary: '用户详情' })
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建用户' })
  async create(@Body() dto: CreateUserDTO) {
    return this.userService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用户' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDTO) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
```

**Step 3: 创建 DTO 文件**

```typescript
// create-user.dto.ts
import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDTO {
  @ApiProperty()
  @IsString() @MinLength(3) username: string;

  @ApiProperty()
  @IsString() @MinLength(8) password: string;

  @ApiProperty()
  @IsString() name: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() departmentId?: string;

  @ApiProperty({ enum: ['user', 'leader', 'admin'] })
  @IsEnum(['user', 'leader', 'admin']) role: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() superiorId?: string;
}
```

```typescript
// update-user.dto.ts
import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDTO {
  @ApiProperty({ required: false })
  @IsOptional() @IsString() name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() departmentId?: string;

  @ApiProperty({ enum: ['user', 'leader', 'admin'], required: false })
  @IsOptional() @IsEnum(['user', 'leader', 'admin']) role?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() superiorId?: string;

  @ApiProperty({ enum: ['active', 'inactive'], required: false })
  @IsOptional() @IsEnum(['active', 'inactive']) status?: string;
}
```

**Step 4: 创建 user.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({ controllers: [UserController], providers: [UserService], exports: [UserService] })
export class UserModule {}
```

**Step 5: 创建 JwtAuthGuard**

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**Step 6: Commit**

```bash
git add server/src/modules/user/
git commit -m "feat: 添加用户管理模块"
```

---

## 前端项目 (client/)

### Task 5: 初始化 Vue 3 项目

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`
- Create: `client/src/main.ts`
- Create: `client/src/App.vue`

**Step 1: 创建 package.json**

```json
{
  "name": "noidear-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "dayjs": "^1.11.0",
    "element-plus": "^2.5.0",
    "pinia": "^2.1.0",
    "vue": "^3.4.0",
    "vue-router": "^4.0.0"
  },
  "devDependencies": {
    "@element-plus/icons-vue": "^2.3.0",
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "eslint": "^8.56.0",
    "eslint-plugin-vue": "^9.0.0",
    "sass": "^1.69.0",
    "typescript": "^5.3.0",
    "unplugin-auto-import": "^0.17.0",
    "unplugin-vue-components": "^0.26.0",
    "vite": "^5.0.0",
    "vue-tsc": "^1.8.0"
  }
}
```

**Step 2: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({ resolvers: [ElementPlusResolver()], imports: ['vue', 'vue-router', 'pinia'] }),
    Components({ resolvers: [ElementPlusResolver()] }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5173, proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } } },
});
```

**Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 4: 创建 main.ts**

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import App from './App.vue';
import router from './router';
import './styles/index.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(ElementPlus, { locale: zhCn });
app.mount('#app');
```

**Step 5: 创建 App.vue**

```vue
<template>
  <router-view />
</template>

<script setup lang="ts">
</script>
```

**Step 6: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文档管理系统</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**Step 7: Commit**

```bash
git add client/package.json client/tsconfig.json client/vite.config.ts client/index.html client/src/main.ts client/src/App.vue
git commit -m "feat: 初始化 Vue 3 项目骨架"
```

---

### Task 6: 路由和状态管理

**Files:**
- Create: `client/src/router/index.ts`
- Create: `client/src/stores/user.ts`
- Create: `client/src/api/request.ts`
- Create: `client/src/views/Login.vue`

**Step 1: 创建 request.ts**

```typescript
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

const request = axios.create({ baseURL: '/api/v1', timeout: 30000 });

request.interceptors.request.use((config: AxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) config.headers = config.headers || {}; config.headers!.Authorization = `Bearer ${token}`;
  return config;
});

request.interceptors.response.use(
  (response: AxiosResponse) => ({ code: response.data?.code ?? 0, data: response.data, message: response.data?.message }),
  (error) => {
    if (error.response?.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; }
    return Promise.reject(error);
  },
);

export default request;
```

**Step 2: 创建 user.ts**

```typescript
import { defineStore } from 'pinia';
import request from '@/api/request';

interface User { id: string; username: string; name: string; role: string; }

export const useUserStore = defineStore('user', {
  state: () => ({ user: null as User | null, token: localStorage.getItem('token') || '' }),
  actions: {
    async login(username: string, password: string) {
      const res = await request.post('/auth/login', { username, password });
      if (res.code === 0) {
        this.token = res.data.token;
        this.user = res.data.user;
        localStorage.setItem('token', this.token);
        return true;
      }
      return false;
    },
    logout() {
      this.user = null; this.token = '';
      localStorage.removeItem('token');
    },
  },
});
```

**Step 3: 创建 router/index.ts**

```typescript
import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/stores/user';

const routes = [
  { path: '/login', component: () => import('@/views/Login.vue') },
  { path: '/', component: () => import('@/views/Layout.vue'), meta: { requiresAuth: true }, children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: () => import('@/views/Dashboard.vue') },
    ] },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore();
  if (to.meta.requiresAuth && !userStore.token) next('/login');
  else next();
});

export default router;
```

**Step 4: 创建 Login.vue**

```vue
<template>
  <div class="login-container">
    <el-card class="login-card">
      <h2>文档管理系统</h2>
      <el-form :model="form" :rules="rules" ref="formRef">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleLogin" :loading="loading" class="login-btn">登录</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const formRef = ref();
const loading = ref(false);
const form = reactive({ username: '', password: '' });
const rules = { username: [{ required: true, message: '请输入用户名', trigger: 'blur' }], password: [{ required: true, message: '请输入密码', trigger: 'blur' }] };

const handleLogin = async () => {
  await formRef.value.validate();
  loading.value = true;
  const success = await userStore.login(form.username, form.password);
  loading.value = false;
  if (success) { ElMessage.success('登录成功'); router.push('/'); }
  else { ElMessage.error('用户名或密码错误'); }
};
</script>

<style scoped>
.login-container { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f7fa; }
.login-card { width: 400px; }
.login-card h2 { text-align: center; margin-bottom: 20px; }
.login-btn { width: 100%; }
</style>
```

**Step 5: 创建 Layout.vue（基础布局）**

```vue
<template>
  <el-container class="layout-container">
    <el-aside width="200px" class="aside">
      <div class="logo">文档管理系统</div>
      <el-menu :default-active="activeMenu" router>
        <el-menu-item index="/dashboard">首页</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <span>欢迎，{{ userStore.user?.name }}</span>
        <el-button link @click="logout">退出</el-button>
      </el-header>
      <el-main><router-view /></el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const activeMenu = computed(() => route.path);
const logout = () => { userStore.logout(); router.push('/login'); };
</script>

<style scoped>
.layout-container { height: 100vh; }
.aside { background: #304156; color: white; }
.logo { height: 60px; line-height: 60px; text-align: center; font-size: 18px; }
.header { display: flex; justify-content: space-between; align-items: center; background: white; border-bottom: 1px solid #e6e6e6; }
</style>
```

**Step 6: 创建 Dashboard.vue**

```vue
<template>
  <div class="dashboard">
    <h1>欢迎使用文档管理系统</h1>
  </div>
</template>
```

**Step 7: 创建全局样式**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif; }
```

**Step 8: Commit**

```bash
git add client/src/router/ client/src/stores/ client/src/api/ client/src/views/ client/src/styles/
git commit -m "feat: 添加路由、状态管理和登录页"
```

---

## 验证步骤

```bash
# 启动 Docker 服务
docker compose up -d

# 后端
cd server
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev

# 前端
cd client
npm install
npm run dev
```

**验证点：**
1. 访问 http://localhost:5173 → 显示登录页
2. 输入 admin/admin123 → 登录成功，进入首页
3. 访问 http://localhost:3000/api/docs → Swagger 文档正常显示

---

## Plan Complete

**Plan saved to:** `docs/plans/2026-02-01-project-skeleton.md`

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
