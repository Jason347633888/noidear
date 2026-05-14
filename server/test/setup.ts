// Jest setup file - runs before all tests
process.env.NODE_ENV = 'test';

// Provide harmless defaults so AppModule can bootstrap inside the test runner.
// E2E suites still need a real DATABASE_URL / MinIO / Redis to talk to live
// services; this only prevents `ConfigService.getOrThrow(...)` from blowing up
// during module construction, so jest can at least report meaningful failures.
const TEST_ENV_DEFAULTS: Record<string, string> = {
  JWT_SECRET: 'test-jwt-secret',
  MINIO_ACCESS_KEY: 'test-access-key',
  MINIO_SECRET_KEY: 'test-secret-key',
  MINIO_BUCKET: 'test-bucket',
  MINIO_ENDPOINT: 'localhost',
  MINIO_PORT: '9000',
  MINIO_USE_SSL: 'false',
};

for (const [key, value] of Object.entries(TEST_ENV_DEFAULTS)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
