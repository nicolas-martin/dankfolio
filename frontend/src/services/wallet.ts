import { RawWalletData } from '@/types';
import { logger } from '@/utils/logger';

// The secureStorage object that used AsyncStorage has been removed
// as it was identified as dead code and used insecure storage practices.
// Wallet credentials are now exclusively managed by keychainService.ts.
