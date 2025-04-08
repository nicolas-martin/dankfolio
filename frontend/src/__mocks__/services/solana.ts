export const getKeypairFromPrivateKey = jest.fn(() => ({
	publicKey: {
		toBase58: () => 'mock-public-key',
	},
})); 