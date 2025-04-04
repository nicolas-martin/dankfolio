module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-community|uuid|@solana|bs58)/)',
  ],
  moduleNameMapper: {
    '^@env$': '<rootDir>/src/__mocks__/env.ts',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1', // Added missing mapping
    '^@/(.*)$': '<rootDir>/src/$1' // Added for general @/ alias
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  setupFiles: ['<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js']
}; 