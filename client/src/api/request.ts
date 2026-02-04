import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { ElMessage } from 'element-plus';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  details?: unknown;
}

export interface ApiError {
  code: number;
  message: string;
  details?: unknown;
  path?: string;
  timestamp?: string;
}

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

// 存储 router 引用（避免循环依赖）
let routerRef: any = null;
export const setRouter = (router: any) => (routerRef = router);

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { code, message, data, details } = response.data as ApiResponse;
    if (code === 0) {
      return data;
    }
    const displayMessage = Array.isArray(message) ? message.join('; ') : message || '请求失败';
    ElMessage.error(displayMessage);
    return Promise.reject({ code, message, details });
  },
  (error: AxiosError<ApiError>) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        localStorage.removeItem('token');
        if (routerRef && routerRef.currentRoute.value.path !== '/login') {
          ElMessage.error(data?.message || '登录已过期，请重新登录');
          routerRef.push('/login');
        }
        return Promise.reject(error);
      }
      const message = data?.message || '请求失败';
      ElMessage.error(message);
      return Promise.reject({ code: data?.code, message, details: data?.details });
    }
    return Promise.reject(error);
  },
);

export default request;
