import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

const request = axios.create({ baseURL: '/api/v1', timeout: 30000 });

request.interceptors.request.use((config: AxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

request.interceptors.response.use(
  (response: AxiosResponse) => ({ code: response.data?.code ?? 0, data: response.data, message: response.data?.message }),
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default request;
