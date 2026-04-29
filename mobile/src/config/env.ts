/**
 * Environment configuration.
 * localhost is only the local development fallback. Production H5 builds must
 * provide VITE_API_BASE_URL, for example https://api.example.com/api/v1.
 */
export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  APP_NAME: import.meta.env.VITE_APP_NAME || '现场终端',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  DEBUG: import.meta.env.DEV,
}

export default ENV
