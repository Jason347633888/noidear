/**
 * Local storage utility
 * Wraps uni.setStorageSync/getStorageSync with type safety
 */

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'user_info'
const DRAFT_PREFIX = 'draft_'
const SYNC_QUEUE_KEY = 'sync_queue'

export function getToken(): string {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

export function setToken(token: string): void {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function removeToken(): void {
  uni.removeStorageSync(TOKEN_KEY)
}

export function getUserInfo<T>(): T | null {
  const data = uni.getStorageSync(USER_KEY)
  return data ? data as T : null
}

export function setUserInfo<T>(info: T): void {
  uni.setStorageSync(USER_KEY, info)
}

export function removeUserInfo(): void {
  uni.removeStorageSync(USER_KEY)
}

export function getDraft<T>(formId: string): T | null {
  const key = `${DRAFT_PREFIX}${formId}`
  const data = uni.getStorageSync(key)
  return data ? data as T : null
}

export function saveDraft<T>(formId: string, data: T): void {
  const key = `${DRAFT_PREFIX}${formId}`
  uni.setStorageSync(key, data)
}

export function removeDraft(formId: string): void {
  const key = `${DRAFT_PREFIX}${formId}`
  uni.removeStorageSync(key)
}

export function getSyncQueue<T>(): T[] {
  return uni.getStorageSync(SYNC_QUEUE_KEY) || []
}

export function setSyncQueue<T>(queue: T[]): void {
  uni.setStorageSync(SYNC_QUEUE_KEY, queue)
}

export function clearSyncQueue(): void {
  uni.removeStorageSync(SYNC_QUEUE_KEY)
}

export function clearAll(): void {
  removeToken()
  removeUserInfo()
  clearSyncQueue()
}
