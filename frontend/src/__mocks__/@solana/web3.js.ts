// Mock Keypair class
export class Keypair {
	publicKey: { toString: () => string };
	secretKey: Uint8Array;

	constructor() {
		this.publicKey = { toString: () => 'mock_public_key' };
		this.secretKey = new Uint8Array(32);
	}

	static fromSecretKey(secretKey: Uint8Array): Keypair {
		const keypair = new Keypair();
		keypair.secretKey = secretKey;
		return keypair;
	}
}

// Mock PublicKey class
export class PublicKey {
	constructor(value: string) {
		// no-op
	}
	toString() {
		return 'mock_public_key';
	}
}

// Mock Transaction class
export class Transaction {
	// Add any methods you need to mock
}

// Mock VersionedTransaction class
export class VersionedTransaction {
	// Add any methods you need to mock
} 