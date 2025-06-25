module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-paper|@gorhom|expo-.*|@sentry/react-native|@sentry/core|@react-native-firebase)/)',
  ],
  testMatch: [
    // Only include pure logic tests
    '**/utils/**/*.test.ts',
    '**/services/**/*.test.ts', 
    '**/store/**/*.test.ts',
    '**/**/scripts.test.ts',
    // Exclude all UI/component tests
    '!**/*Screen.test.(ts|tsx)',
    '!**/components/**/*.test.(tsx)',
    '!**/Navigation/*.test.(tsx)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    // Ignore UI test files - these will be migrated to Maestro
    'src/screens/.*/.*Screen.test.tsx',
    'src/components/.*/.*\\.test\\.tsx',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*Screen.tsx', // Exclude screen components from coverage
    '!src/**/index.tsx',   // Exclude index files (usually just exports)
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
    // Focus coverage on logic files
    'src/**/scripts.ts',
    'src/utils/**/*.ts',
    'src/services/**/*.ts',
    'src/store/**/*.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
  // setupFilesAfterEnv: ['<rootDir>/src/__mocks__/setup.js'], // Explicitly load setup file
  verbose: true,
};