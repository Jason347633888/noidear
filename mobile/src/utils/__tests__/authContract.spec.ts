import { describe, expect, it } from 'vitest'
import type { LoginResult, UserInfo } from '@/types'

describe('mobile auth contract', () => {
  it('matches backend /auth/login user payload', () => {
    const result: LoginResult = {
      token: 'jwt-token',
      user: {
        id: 'user-1',
        username: 'operator',
        name: '操作员',
        role: 'operator',
      },
    }

    const user: UserInfo = result.user

    expect(user.name).toBe('操作员')
    expect(user.username).toBe('operator')
  })
})
