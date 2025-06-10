import { signTransferTransaction } from '../solana';
import { Base58PrivateKey } from '@/types';

describe('Transaction Validation', () => {
  const mockUserPublicKey = 'GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R';
  const mockPrivateKey = '5J1F7GHadZG3sCkuKy9xQeqxuPiiiMT4rj2JfpS8XCvs' as Base58PrivateKey; // Mock private key for testing

  it('should fail to sign the original mock transaction (versioned)', async () => {
    const originalMockTx = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAGCekCd/S1HV8txmyKfIAWKWxswDuUWLUqjZYc6PbaNJgCS6xdNRGIgknfxCI44w8fMixamF6aM2jvWuJv9F6HQGCYGhB4xuDMrDdhavUhIeB7Cm55/scPKspWwzD2R6pEoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAEedVb8jHAbu50xW7OaBUH/bGy3qP0jlECsc2iVrwTjwbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpjJclj04kifG7PRApFI4NgwtaE5na/xCEBI572Nvp+Fm0P/on9df2SnTAmx8pWHneSwmrNt/J3VFLMhqns4zl6Ay7y3ZxksVsqzi2N3jHaFEqLW3iYBGcYX3hKK2J6TtECAQABQILSwIABAAJA6AsAAAAAAAABwYAAgAPAwYBAQMCAAIMAgAAAIwMCAAAAAAABgECAREHBgABABEDBgEBBRsGAAIBBREFCAUOCw4NCgIBEQ0JDgAGBhAODAUj5RfLl3rjrSoBAAAAJmQAAYwMCAAAAAAA3IhZ0AEAAABQAAAGAwIAAAEJAWpgiN9xbBUoxnUHH86lRaehpUhg3jmT4dhHYEv2EYR2BX9ZW36DBC4CdVo=';
    
    await expect(
      signTransferTransaction(originalMockTx, mockUserPublicKey, mockPrivateKey)
    ).rejects.toThrow(/Versioned messages must be deserialized with VersionedMessage.deserialize/);
  });

  it('should successfully sign the new mock transaction (legacy)', async () => {
    const newMockTx = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDArczbMia1tLmq2poQQFqpk1DjxsqKE8GeC9ryYH1HdwvGGZjAZdDGA7Pr6QQlnw0VJXaPQvvKQVUMtq7m8OiWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUpTYB5Tb+LKsJQWZbJuXaPgODJ8XYzMUqv2V0+PYUAAAQIAAAEMANQBAAAAAAAA';
    
    // This should not throw an error
    await expect(
      signTransferTransaction(newMockTx, mockUserPublicKey, mockPrivateKey)
    ).resolves.toBeDefined();
  });

  it('should validate that our current mock transaction works', async () => {
    // Test the exact transaction we're using in our mock API
    const currentMockTx = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDArczbMia1tLmq2poQQFqpk1DjxsqKE8GeC9ryYH1HdwvGGZjAZdDGA7Pr6QQlnw0VJXaPQvvKQVUMtq7m8OiWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUpTYB5Tb+LKsJQWZbJuXaPgODJ8XYzMUqv2V0+PYUAAAQIAAAEMANQBAAAAAAAA';
    
    const result = await signTransferTransaction(currentMockTx, mockUserPublicKey, mockPrivateKey);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    
    console.log('✅ Current mock transaction successfully signed');
  });
}); 