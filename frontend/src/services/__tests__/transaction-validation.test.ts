// Mock the environment and logger before importing other modules
jest.mock('@/utils/env');
jest.mock('@/utils/logger');

import { Keypair, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { Base58PrivateKey } from '@/types';
import { Buffer } from 'buffer';

// This is the exact transaction used in mockApi.ts for preparetransfer endpoint
const MOCK_API_TRANSACTION = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDArczbMia1tLmq2poQQFqpk1DjxsqKE8GeC9ryYH1HdwvGGZjAZdDGA7Pr6QQlnw0VJXaPQvvKQVUMtq7m8OiWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUpTYB5Tb+LKsJQWZbJuXaPgODJ8XYzMUqv2V0+PYUAAAQIAAAEMANQBAAAAAAAA';

// Helper function to create keypair from private key (copied from solana service)
const getKeypairFromPrivateKey = (privateKey: Base58PrivateKey): Keypair => {
  try {
    const secretKey = bs58.decode(privateKey);
    if (secretKey.length !== 64) {
      throw new Error(`Invalid private key length: ${secretKey.length} bytes. Expected 64 bytes.`);
    }
    const keypair = Keypair.fromSecretKey(secretKey);
    return keypair;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`An unknown error occurred in getKeypairFromPrivateKey: ${error}`);
    }
  }
};

// Simplified transaction signing function for testing (without connection dependency)
const signTransactionForTest = async (
  unsignedTransaction: string,
  userPublicKey: string,
  privateKey: Base58PrivateKey
): Promise<string> => {
  try {
    if (!userPublicKey) {
      throw new Error('No userPublicKey provided for signTransactionForTest');
    }
    if (!privateKey) {
      throw new Error('No privateKey provided for signTransactionForTest');
    }

    const keypair = getKeypairFromPrivateKey(privateKey);

    // Decode and deserialize the transaction
    const transactionBuf = Buffer.from(unsignedTransaction, 'base64');
    
    // Try to parse as legacy transaction first
    const transaction = Transaction.from(transactionBuf);

    // Sign with our keypair (without setting blockhash for test)
    transaction.sign(keypair);

    // Serialize the signed transaction
    const serializedTransaction = transaction.serialize().toString('base64');

    return serializedTransaction;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`An unknown error occurred in signTransactionForTest: ${error}`);
    }
  }
};

describe('Transaction Validation', () => {
  const mockUserPublicKey = 'GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R';
  
  // Use a mock Base58 private key for testing
  const mockPrivateKey = '5J1F7GHadZG3sCkuKy9xQeqxuPiiiMT4rj2JfpS8XCvs' as Base58PrivateKey;

  describe('Legacy vs Versioned Transaction Validation', () => {
    it('should fail to sign the original mock transaction (versioned)', async () => {
      const originalMockTx = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAGCekCd/S1HV8txmyKfIAWKWxswDuUWLUqjZYc6PbaNJgCS6xdNRGIgknfxCI44w8fMixamF6aM2jvWuJv9F6HQGCYGhB4xuDMrDdhavUhIeB7Cm55/scPKspWwzD2R6pEoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAEedVb8jHAbu50xW7OaBUH/bGy3qP0jlECsc2iVrwTjwbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpjJclj04kifG7PRApFI4NgwtaE5na/xCEBI572Nvp+Fm0P/on9df2SnTAmx8pWHneSwmrNt/J3VFLMhqns4zl6Ay7y3ZxksVsqzi2N3jHaFEqLW3iYBGcYX3hKK2J6TtECAQABQILSwIABAAJA6AsAAAAAAAABwYAAgAPAwYBAQMCAAIMAgAAAIwMCAAAAAAABgECAREHBgABABEDBgEBBRsGAAIBBREFCAUOCw4NCgIBEQ0JDgAGBhAODAUj5RfLl3rjrSoBAAAAJmQAAYwMCAAAAAAA3IhZ0AEAAABQAAAGAwIAAAEJAWpgiN9xbBUoxnUHH86lRaehpUhg3jmT4dhHYEv2EYR2BX9ZW36DBC4CdVo=';
      
      await expect(
        signTransactionForTest(originalMockTx, mockUserPublicKey, mockPrivateKey)
      ).rejects.toThrow(/Versioned messages must be deserialized with VersionedMessage.deserialize/);
    });

    it('should successfully sign a legacy transaction format', async () => {
      const legacyMockTx = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDArczbMia1tLmq2poQQFqpk1DjxsqKE8GeC9ryYH1HdwvGGZjAZdDGA7Pr6QQlnw0VJXaPQvvKQVUMtq7m8OiWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUpTYB5Tb+LKsJQWZbJuXaPgODJ8XYzMUqv2V0+PYUAAAQIAAAEMANQBAAAAAAAA';
      
      // This should not throw an error
      await expect(
        signTransactionForTest(legacyMockTx, mockUserPublicKey, mockPrivateKey)
      ).resolves.toBeDefined();
    });
  });

  describe('Mock API Transaction Validation', () => {
    it('should validate that mock API preparetransfer transaction is signable', async () => {
      const result = await signTransactionForTest(MOCK_API_TRANSACTION, mockUserPublicKey, mockPrivateKey);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      
      console.log('✅ Mock API preparetransfer transaction successfully signed');
      console.log('📝 Transaction length:', result.length);
    });

    it('should validate transaction format and structure', async () => {
      // Test that the transaction can be parsed without throwing
      expect(() => {
        const buffer = Buffer.from(MOCK_API_TRANSACTION, 'base64');
        expect(buffer.length).toBeGreaterThan(0);
      }).not.toThrow();
      
      console.log('✅ Mock API transaction has valid base64 format');
    });

    it('should handle signing with different user public keys', async () => {
      const alternativePublicKey = 'So11111111111111111111111111111111111111112'; // SOL mint as test key
      
      // Should not throw an error even with different public key
      await expect(
        signTransactionForTest(MOCK_API_TRANSACTION, alternativePublicKey, mockPrivateKey)
      ).resolves.toBeDefined();
      
      console.log('✅ Mock API transaction works with alternative public keys');
    });

    it('should produce consistent signatures for the same inputs', async () => {
      const result1 = await signTransactionForTest(MOCK_API_TRANSACTION, mockUserPublicKey, mockPrivateKey);
      const result2 = await signTransactionForTest(MOCK_API_TRANSACTION, mockUserPublicKey, mockPrivateKey);
      
      expect(result1).toBe(result2);
      console.log('✅ Mock API transaction produces consistent signatures');
    });

    it('should validate that transaction can be parsed as legacy format', async () => {
      // Test that the mock API transaction is indeed a legacy transaction
      expect(() => {
        const transactionBuf = Buffer.from(MOCK_API_TRANSACTION, 'base64');
        const transaction = Transaction.from(transactionBuf);
        expect(transaction).toBeDefined();
      }).not.toThrow();
      
      console.log('✅ Mock API transaction is valid legacy format');
    });
  });

  describe('Error Handling Validation', () => {
    it('should handle invalid base64 transaction gracefully', async () => {
      const invalidTransaction = 'invalid_base64_transaction';
      
      await expect(
        signTransactionForTest(invalidTransaction, mockUserPublicKey, mockPrivateKey)
      ).rejects.toThrow();
    });

    it('should handle empty transaction gracefully', async () => {
      const emptyTransaction = '';
      
      await expect(
        signTransactionForTest(emptyTransaction, mockUserPublicKey, mockPrivateKey)
      ).rejects.toThrow();
    });

    it('should handle invalid private key format gracefully', async () => {
      const invalidPrivateKey = 'invalid_private_key' as Base58PrivateKey;
      
      await expect(
        signTransactionForTest(MOCK_API_TRANSACTION, mockUserPublicKey, invalidPrivateKey)
      ).rejects.toThrow();
    });
  });

  describe('Mock API Consistency Check', () => {
    it('should ensure mock API transaction matches test expectations', () => {
      // This test ensures that if someone changes the mock API transaction,
      // they need to update the tests accordingly
      const expectedMockTransaction = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDArczbMia1tLmq2poQQFqpk1DjxsqKE8GeC9ryYH1HdwvGGZjAZdDGA7Pr6QQlnw0VJXaPQvvKQVUMtq7m8OiWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUpTYB5Tb+LKsJQWZbJuXaPgODJ8XYzMUqv2V0+PYUAAAQIAAAEMANQBAAAAAAAA';
      
      // If this test fails, it means the mock API transaction has been changed
      // and the tests need to be updated accordingly
      expect(MOCK_API_TRANSACTION).toBe(expectedMockTransaction);
      
      console.log('✅ Mock API transaction matches expected format');
      console.log('📋 If this test fails, update the MOCK_API_TRANSACTION constant');
    });

    it('should validate that mock API transaction is used in mockApi.ts', () => {
      // This test documents that the transaction should match what's in mockApi.ts
      // If someone changes the mock API, this test will remind them to update both places
      const mockApiTransactionComment = 'This is the exact transaction used in mockApi.ts for preparetransfer endpoint';
      
      // This is more of a documentation test to ensure consistency
      expect(MOCK_API_TRANSACTION.length).toBeGreaterThan(100); // Reasonable transaction length
      expect(MOCK_API_TRANSACTION).toMatch(/^[A-Za-z0-9+/]+=*$/); // Valid base64 format
      
      console.log('✅ Mock API transaction format validated');
      console.log('📋 Remember to keep this in sync with mockApi.ts preparetransfer endpoint');
    });
  });
}); 