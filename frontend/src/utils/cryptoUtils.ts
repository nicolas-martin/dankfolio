import { Buffer } from 'buffer';
import bs58 from 'bs58';
import { logger } from '@/utils/logger';

// Branded type for Base58 private keys to ensure type safety
export type Base58PrivateKey = string & { readonly __brand: unique symbol };

// Helper function to convert Base64 to Base58PrivateKey
export const base64ToBase58PrivateKey = (base64Key: string): Base58PrivateKey => {
	// Decode Base64 to bytes
	const bytes = Buffer.from(base64Key, 'base64');
	logger.log('Converting Base64 to Base58', {
		base64Length: base64Key.length,
		bytesLength: bytes.length,
		isValidLength: bytes.length === 64  // This will be logged as part of the object
	});

	if (bytes.length !== 64) {
		// This error will be caught by the calling function, so no need to log separately here
		throw new Error(`Invalid private key length: ${bytes.length} bytes. Expected 64 bytes.`);
	}

	// Convert to Base58
	const base58Key = bs58.encode(bytes) as Base58PrivateKey;
	logger.log('Converted to Base58', {
		base58Length: base58Key.length,
		base58Preview: base58Key.substring(0, 10) + '...'
	});

	return base58Key;
};

// Helper function to convert Buffer to Base58PrivateKey safely
export const toBase58PrivateKey = (bytes: Uint8Array): Base58PrivateKey => {
	if (bytes.length !== 64) {
		throw new Error(`Invalid private key length: ${bytes.length} bytes. Expected 64 bytes.`);
	}
	return bs58.encode(bytes) as Base58PrivateKey;
};
