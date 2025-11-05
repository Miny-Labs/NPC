module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/e2e'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'packages/**/*.ts',
    '!packages/**/*.d.ts',
    '!packages/**/node_modules/**',
    '!packages/**/dist/**',
  ],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.ts'],
  testTimeout: 60000,
  maxWorkers: 1, // Run tests sequentially for E2E
  verbose: true,
  detectOpenHandles: true,
  forceExit: true
};