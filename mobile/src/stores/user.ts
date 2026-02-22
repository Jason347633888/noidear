import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo, LoginForm, LoginResult } from '@/types'
import { post, get } from '@/utils/request'
import {
  getToken, setToken, removeToken,
  getUserInfo, setUserInfo, removeUserInfo,
  clearAll,
} from '@/utils/storage'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>('')
  const userInfo = ref<UserInfo | null>(null)
  const isLoggedIn = computed(() => !!token.value)

  function initFromStorage(): void {
    token.value = getToken()
    const stored = getUserInfo<UserInfo>()
    if (stored) {
      userInfo.value = stored
    }
  }

  async function login(form: LoginForm): Promise<void> {
    try {
      const result = await post<LoginResult>('/auth/login', form as unknown as Record<string, unknown>)
      token.value = result.token
      userInfo.value = result.user
      setToken(result.token)
      setUserInfo(result.user)
    } catch (error) {
      throw error
    }
  }

  async function fetchProfile(): Promise<void> {
    try {
      const profile = await get<UserInfo>('/auth/profile')
      userInfo.value = profile
      setUserInfo(profile)
    } catch (error) {
      throw error
    }
  }

  async function changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    await post('/auth/password', {
      oldPassword,
      newPassword,
    })
  }

  function logout(): void {
    token.value = ''
    userInfo.value = null
    clearAll()
    uni.reLaunch({ url: '/pages/login/index' })
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    initFromStorage,
    login,
    fetchProfile,
    changePassword,
    logout,
  }
})
