const mockSharedValue = (initialValue: any) => ({
	value: initialValue,
});

const useDerivedValue = (callback: () => any, dependencies: any[]) => {
	return mockSharedValue(callback());
};

const runOnJS = (fn: Function) => fn;

const cancelAnimation = jest.fn();

const useAnimatedStyle = () => ({});

module.exports = {
	...require('react-native-reanimated/mock'),
	useDerivedValue,
	runOnJS: (fn: Function) => fn,
	cancelAnimation,
	useAnimatedStyle,
	default: {
		call: () => { }
	}
}; 