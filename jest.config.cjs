module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/__tests__/setupTests.js',
    '<rootDir>/e2e/'
  ],
  testTimeout: 10000, // 10 second timeout
  maxWorkers: 1, // Run tests serially to avoid race conditions
  verbose: true
};
