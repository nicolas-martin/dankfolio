module.exports = {
	preset: 'react-native',
	silent: true,
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
	transformIgnorePatterns: [
		'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-paper|lucide-react-native|react-native-vector-icons|victory-.*|@shopify/react-native-skia|react-native-reanimated|d3-.*|internmap|expo-haptics|expo-modules-core)/)',
	],
	moduleNameMapper: {
		'^@env$': '<rootDir>/src/__mocks__/env.ts',
		'^@store/(.*)$': '<rootDir>/src/store/$1',
		'^@components/(.*)$': '<rootDir>/src/components/$1',
		'^@services/(.*)$': '<rootDir>/src/services/$1',
		'^@/(.*)$': '<rootDir>/src/$1', // Added for general @/ alias
		// Mock font files
		'\\.(ttf)$': '<rootDir>/src/__mocks__/fileMock.js'
	},
	transform: {
		'^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
	},
	setupFiles: ['<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js']
};
