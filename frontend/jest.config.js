module.exports = {
	preset: 'react-native',
	silent: true,
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
	transformIgnorePatterns: [
		'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-reanimated|victory-native|@shopify/react-native-skia|react-native-vector-icons|uuid|expo-updates|expo-modules-core)/)',
	],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1', // Matches @/anything
		'^@components/(.*)$': '<rootDir>/src/components/$1', // Matches @components/anything
		'^@screens/(.*)$': '<rootDir>/src/screens/$1', // Matches @screens/anything
		'^@store/(.*)$': '<rootDir>/src/__mocks__/store/$1', // Matches @store/anything
		'^@services/(.*)$': '<rootDir>/src/__mocks__/services/$1', // Matches @services/anything
		'^@env$': '<rootDir>/src/__mocks__/env.ts', // Matches @env
		'^@utils/(.*)$': '<rootDir>/src/utils/$1', // Matches @utils/anything
		'^loglevel$': '<rootDir>/src/__mocks__/loglevel.ts', // Mock loglevel
		// Mock font and image files
		'\\.(ttf|png|jpg|jpeg|gif)$': '<rootDir>/src/__mocks__/fileMock.js', // Mock files
		// Mock external packages
		'^react-native-reanimated$': '<rootDir>/src/__mocks__/react-native-reanimated.ts',
		'^@shopify/react-native-skia$': '<rootDir>/src/__mocks__/@shopify/react-native-skia.ts',
		'^victory-native$': '<rootDir>/src/__mocks__/victory-native.ts',
		'^expo-haptics$': '<rootDir>/src/__mocks__/expo-haptics.ts',
		'\\.(ttf)$': '<rootDir>/src/__mocks__/file-mock.js',
		'^expo-updates$': '<rootDir>/src/__mocks__/expo-updates.ts'
	},
	transform: {
		'^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
	},
	setupFiles: [
		'./node_modules/react-native-gesture-handler/jestSetup.js'
	]
};
