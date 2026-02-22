/**
 * 环境变量配置
 * 通过 import.meta.env 访问 Vite 环境变量
 */

export const ENV = {
  // API 基础地址
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',

  // 微信小程序 appid
  WEIXIN_APPID: import.meta.env.VITE_WEIXIN_APPID || '__UNI__DOCMGR',

  // 文件上传地址
  UPLOAD_URL: import.meta.env.VITE_UPLOAD_URL || 'http://localhost:3000/api/upload',

  // MinIO 访问地址
  MINIO_URL: import.meta.env.VITE_MINIO_URL || 'http://localhost:9000',

  // 是否开启调试模式
  DEBUG: import.meta.env.VITE_DEBUG === 'true',

  // 是否开启 Mock 数据
  USE_MOCK: import.meta.env.VITE_USE_MOCK === 'true',

  // 是否为生产环境
  IS_PROD: import.meta.env.MODE === 'production',

  // 是否为开发环境
  IS_DEV: import.meta.env.MODE === 'development',
};
