export const useWalletStore = () => ({
	wallet: {
		publicKey: 'mock-public-key',
		privateKey: 'mock-private-key',
	},
	setWallet: jest.fn(),
}); 