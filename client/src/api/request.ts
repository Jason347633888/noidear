import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { ElMessage } from 'element-plus';
import { getCurrentInstance, nextTick } from 'vue';

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
        // 使用 getCurrentInstance 延迟获取 router，避免循环依赖
        nextTick(() => {
          const instance = getCurrentInstance();
          const router = instance?.appContext.config.globalProperties.$router;
          if (router && router.currentRoute.value.path !== '/login') {
            ElMessage.error(data?.message || '登录已过期，请重新登录');
            router.push('/login');
          }
        });
        return Promise.reject(error);
      }
      const message = data?.message || '请求失败';
      ElMessage.error(message);
      return Promise.reject({ code: data?.code, message, details: data?.details });
    }
    // 网络错误不显示错误消息，避免初始化时干扰
    return Promise.reject(error);
  },
);

export default request;
