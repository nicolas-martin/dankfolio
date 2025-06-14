import ReanimatedMock from 'react-native-reanimated/mock';

// Define a generic type for the shared value structure
export interface SharedValue<T> {
	value: T;
}

const mockSharedValue = <T>(initialValue: T): SharedValue<T> => ({
	value: initialValue,
});

const useDerivedValue = <T>(callback: () => T, _dependencies: unknown[]): SharedValue<T> => {
	return mockSharedValue(callback());
};

// Make runOnJS generic to preserve the function signature
const runOnJS = <T extends (...args: unknown[]) => unknown>(fn: T): T => fn;

const cancelAnimation = jest.fn();

const useAnimatedStyle = () => ({}); // Returns a style object, so Record<string, any> or a more specific style type

module.exports = {
	...ReanimatedMock,
	useDerivedValue,
	runOnJS, // Use the new generic runOnJS
	cancelAnimation,
	useAnimatedStyle,
	default: {
		call: () => { }, // This mock for default.call might need more specific typing if its usage is known
	},
	// Mock other specific exports if needed by tests, e.g.:
	// Value: mockSharedValue, // If tests directly use `new Value()`
	// Easing: { ... },
	// etc.
}; 