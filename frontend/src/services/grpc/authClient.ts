import { REACT_APP_API_URL } from '@env';
import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { AuthService } from "@/gen/dankfolio/v1/auth_pb";

if (!REACT_APP_API_URL) {
	throw new Error('REACT_APP_API_URL environment variable is required');
}

// Separate transport for auth requests (no auth interceptor to prevent circular dependency)
const authTransport = createConnectTransport({
	baseUrl: REACT_APP_API_URL,
});

// Auth client without authentication interceptor
export const authClient = createClient(AuthService, authTransport); 