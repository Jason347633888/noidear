/**
 * 共享的E2E测试工具函数
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

/**
 * 提取响应数据（处理包装的响应格式）
 * 处理两种格式：
 * 1. { data: { ... } } - 被 ResponseInterceptor 包装
 * 2. { ... } - 直接返回
 */
export function getData(body: any): any {
  return body?.data ?? body;
}

/**
 * E2E测试登录辅助函数
 * 确保登录成功并返回 token 和 userId
 */
export async function loginForTest(
  app: INestApplication,
  username: string,
  password: string,
): Promise<{ token: string; userId: string; user: any }> {
  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ username, password })
    .expect(200);

  const data = getData(loginRes.body);

  if (!data || !data.token || !data.user || !data.user.id) {
    throw new Error('Login failed: Invalid response structure');
  }

  return {
    token: data.token,
    userId: data.user.id,
    user: data.user,
  };
}

/**
 * 创建测试用户辅助函数
 */
export async function createTestUser(
  app: INestApplication,
  adminToken: string,
  userData: {
    username: string;
    name: string;
    password: string;
    role?: string;
    departmentId?: string;
  },
): Promise<any> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      username: userData.username,
      name: userData.name,
      password: userData.password,
      role: userData.role || 'user',
      departmentId: userData.departmentId,
    })
    .expect(201);

  return getData(response.body);
}
