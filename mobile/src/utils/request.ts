/**
 * Network request utility
 * Wraps uni.request with interceptors, token injection, error handling
 */
import { getToken, removeToken } from './storage';
import { ENV } from '../config/env';

const BASE_URL = ENV.API_BASE_URL;
const TIMEOUT = 15000;

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: Record<string, unknown> | unknown[]
  header?: Record<string, string>
  showLoading?: boolean
  loadingText?: string
}

interface ResponseData<T = unknown> {
  code: number
  data: T
  message: string
  success: boolean
}

function buildUrl(url: string): string {
  if (url.startsWith('http')) {
    return url
  }
  return `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

function getAuthHeader(): Record<string, string> {
  const token = getToken()
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

function handleUnauthorized(): void {
  removeToken()
  uni.reLaunch({ url: '/pages/login/index' })
}

export function request<T = unknown>(options: RequestOptions): Promise<T> {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    showLoading = false,
    loadingText = '加载中...',
  } = options

  if (showLoading) {
    uni.showLoading({ title: loadingText, mask: true })
  }

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: buildUrl(url),
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...header,
      },
      timeout: TIMEOUT,
      success: (res) => {
        if (showLoading) {
          uni.hideLoading()
        }

        const statusCode = res.statusCode
        if (statusCode === 401) {
          handleUnauthorized()
          reject(new Error('登录已过期，请重新登录'))
          return
        }

        if (statusCode === 403) {
          uni.showToast({ title: '没有操作权限', icon: 'none' })
          reject(new Error('没有操作权限'))
          return
        }

        if (statusCode >= 200 && statusCode < 300) {
          const responseData = res.data as ResponseData<T>
          if (responseData.success !== false) {
            resolve(responseData.data !== undefined ? responseData.data : responseData as unknown as T)
          } else {
            uni.showToast({ title: responseData.message || '请求失败', icon: 'none' })
            reject(new Error(responseData.message || '请求失败'))
          }
          return
        }

        const errMsg = (res.data as ResponseData)?.message || `请求失败(${statusCode})`
        uni.showToast({ title: errMsg, icon: 'none' })
        reject(new Error(errMsg))
      },
      fail: (err) => {
        if (showLoading) {
          uni.hideLoading()
        }
        const message = err.errMsg?.includes('timeout') ? '请求超时' : '网络连接失败'
        uni.showToast({ title: message, icon: 'none' })
        reject(new Error(message))
      },
    })
  })
}

export function get<T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'GET', data })
}

export function post<T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'POST', data })
}

export function put<T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'PUT', data })
}

export function del<T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'DELETE', data })
}

/**
 * Upload file using uni.uploadFile
 */
export function uploadFile(
  filePath: string,
  name: string = 'file',
  formData?: Record<string, string>,
  onProgress?: (progress: number) => void,
): Promise<{ url: string; thumbnailUrl?: string }> {
  const token = getToken()
  return new Promise((resolve, reject) => {
    const uploadTask = uni.uploadFile({
      url: buildUrl('/mobile/upload'),
      filePath,
      name,
      header: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      formData,
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const data = JSON.parse(res.data)
            resolve(data.data || data)
          } catch {
            reject(new Error('解析上传结果失败'))
          }
        } else {
          reject(new Error(`上传失败(${res.statusCode})`))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '上传失败'))
      },
    })

    if (onProgress && uploadTask) {
      uploadTask.onProgressUpdate((res) => {
        onProgress(res.progress)
      })
    }
  })
}
