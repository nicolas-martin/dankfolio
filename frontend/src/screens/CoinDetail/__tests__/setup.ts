// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
	const Reanimated = require('react-native-reanimated/mock');
	Reanimated.default.call = () => { };
	return Reanimated;
});

// Mock @shopify/react-native-skia
jest.mock('@shopify/react-native-skia', () => ({
	Canvas: 'Canvas',
	Fill: 'Fill',
	Path: 'Path',
	Skia: {
		Path: {
			Make: () => ({
				moveTo: () => { },
				lineTo: () => { },
				close: () => { },
			}),
		},
	},
}));

// Mock victory-native
jest.mock('victory-native', () => ({
	CartesianChart: 'CartesianChart',
	useChartPressState: () => ({
		state: { x: { value: 0 }, y: { y: { value: 0 } } },
		isActive: false,
	}),
	Area: 'Area',
	Line: 'Line',
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: {
		Light: 'light',
	},
}));

// Mock Solana service
jest.mock('@services/solana', () => ({
	getKeypairFromPrivateKey: jest.fn(() => ({
		publicKey: {
			toBase58: () => 'mock-public-key',
		},
	})),
}));

// Mock wallet store
jest.mock('@store/wallet', () => ({
	useWalletStore: () => ({
		wallet: {
			publicKey: 'mock-public-key',
			privateKey: 'mock-private-key',
		},
		setWallet: jest.fn(),
	}),
})); 