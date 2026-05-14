// E2E config: opt-in suite for tests that require DATABASE_URL / JWT_SECRET /
// pre-seeded admin (Postgres + Redis + MinIO). Selected via `npm run test:e2e`
// or `npm run traceability:e2e`.

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { diagnostics: false }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage-e2e',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../client/src/$1',
  },
  setupFiles: ['<rootDir>/test/setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.backup/',
    // Old schema tests (template/task/taskRecord models no longer exist in schema)
    'test/recycle-bin.e2e-spec.ts',
    'test/export.e2e-spec.ts',
    'test/statistics.e2e-spec.ts',
    'test/task-batch-export.e2e-spec.ts',
    // i18n module not yet implemented
    'test/i18n.e2e-spec.ts',
    // backup module does not exist in this codebase
    'test/backup.e2e-spec.ts',
    // health routes (/health, /health/postgres etc.) replaced by /liveness
    'test/health.e2e-spec.ts',
  ],
};
