/**
 * Auth API module
 * Maps to backend /auth endpoints (JWT authentication)
 */
import { post, get } from '@/utils/request'
import type { LoginForm, LoginResult, UserInfo } from '@/types'

export async function login(form: LoginForm): Promise<LoginResult> {
  return post<LoginResult>('/auth/login', form as unknown as Record<string, unknown>)
}

export async function getProfile(): Promise<UserInfo> {
  return get<UserInfo>('/auth/profile')
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await post('/auth/change-password', { oldPassword, newPassword })
}
