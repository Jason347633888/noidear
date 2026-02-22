module.exports = {
  preset: '@dcloudio/uni-automator/jest-preset',
  testEnvironment: '@dcloudio/uni-automator/dist/environment',
  testTimeout: 30000,
  reporters: ['default'],
  watchPathIgnorePatterns: ['/node_modules/', '/dist/', '/.git/'],
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
}
