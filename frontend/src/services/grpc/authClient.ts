import { REACT_APP_API_URL } from '@env';
import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { AuthService } from "@/gen/dankfolio/v1/auth_pb";
import { logger as log } from '@/utils/logger';

// Log the environment variable for debugging
log.log('🔧 REACT_APP_API_URL from environment (auth):', REACT_APP_API_URL);

if (!REACT_APP_API_URL) {
	const errorMsg = 'REACT_APP_API_URL environment variable is required but not set. Please check your .env configuration.';
	log.error('❌ Environment Error (auth):', errorMsg);
	throw new Error(errorMsg);
}

// Validate URL format
if (!REACT_APP_API_URL.startsWith('http://') && !REACT_APP_API_URL.startsWith('https://')) {
	const errorMsg = `REACT_APP_API_URL must start with http:// or https://. Current value: "${REACT_APP_API_URL}"`;
	log.error('❌ URL Format Error (auth):', errorMsg);
	throw new Error(errorMsg);
}

// Separate transport for auth requests (no auth interceptor to prevent circular dependency)
const authTransport = createConnectTransport({
	baseUrl: REACT_APP_API_URL,
});

// Auth client without authentication interceptor
export const authClient = createClient(AuthService, authTransport); 