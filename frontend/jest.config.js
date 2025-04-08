module.exports = {
	preset: 'react-native',
	silent: true,
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
	transformIgnorePatterns: [
		'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-reanimated|victory-native|@shopify/react-native-skia)/)',
	],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'^@components/(.*)$': '<rootDir>/src/components/$1',
		'^@store/(.*)$': '<rootDir>/src/__mocks__/store/$1',
		'^@services/(.*)$': '<rootDir>/src/__mocks__/services/$1',
		'^@env$': '<rootDir>/src/__mocks__/env.ts',
		'^@utils/(.*)$': '<rootDir>/src/utils/$1',
		// Mock font files
		'\\.(ttf)$': '<rootDir>/src/__mocks__/fileMock.js'
	},
	transform: {
		'^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
	},
	setupFiles: [
		'./node_modules/react-native-gesture-handler/jestSetup.js',
	]
};
