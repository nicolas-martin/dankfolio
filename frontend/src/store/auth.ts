import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { logger } from '@/utils/logger';

const BEARER_TOKEN_KEY = 'dankfolio_bearer_token';
const TOKEN_EXPIRY_KEY = 'dankfolio_token_expiry';

interface AuthState {
	token: string | null;
	expiresAt: Date | null;
	deviceId: string | null;
	isLoading: boolean;
	error: string | null;
	isAuthenticated: boolean;
	initialize: () => Promise<void>;
	setToken: (token: string, expiresAt: Date) => Promise<void>;
	clearToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
	subscribeWithSelector((set, get) => ({
		token: null,
		expiresAt: null,
		deviceId: null,
		isLoading: true,
		error: null,
		isAuthenticated: false,

		initialize: async () => {
			set({ isLoading: true, error: null });
			try {
				logger.info('Initializing auth store...');
				const storedToken = await AsyncStorage.getItem(BEARER_TOKEN_KEY);
				const storedExpiry = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
				const uniqueId = await DeviceInfo.getUniqueId();
				set({ deviceId: uniqueId });

				if (storedToken && storedExpiry) {
					const expiryDate = new Date(storedExpiry);
					if (expiryDate > new Date()) {
						logger.info('Token found in storage and is valid.');
						set({
							token: storedToken,
							expiresAt: expiryDate,
							isAuthenticated: true,
						});
					} else {
						logger.info('Token found in storage but has expired. Clearing token.');
						await get().clearToken(); // Call clearToken if expired
					}
				} else {
					logger.info('No token found in storage.');
					set({ isAuthenticated: false }); // Ensure isAuthenticated is false if no token
				}
				set({ isLoading: false });
			} catch (e: any) {
				logger.error('Failed to initialize auth store:', e);
				set({ error: e.message || 'Failed to initialize', isLoading: false, isAuthenticated: false });
			}
		},

		setToken: async (token: string, expiresAt: Date) => {
			try {
				logger.info('Setting token...');
				await AsyncStorage.setItem(BEARER_TOKEN_KEY, token);
				await AsyncStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toISOString());
				set({ token, expiresAt, isAuthenticated: true, error: null });
				logger.info('Token set successfully.');
			} catch (e: any) {
				logger.error('Failed to set token:', e);
				set({ error: e.message || 'Failed to set token' });
			}
		},

		clearToken: async () => {
			try {
				logger.info('Clearing token...');
				await AsyncStorage.removeItem(BEARER_TOKEN_KEY);
				await AsyncStorage.removeItem(TOKEN_EXPIRY_KEY);
				set({ token: null, expiresAt: null, isAuthenticated: false, error: null });
				logger.info('Token cleared successfully.');
			} catch (e: any) {
				logger.error('Failed to clear token:', e);
				set({ error: e.message || 'Failed to clear token' });
			}
		},
	})));

// Auto-update isAuthenticated whenever token or expiresAt changes
useAuthStore.subscribe(
	(state) => ({ token: state.token, expiresAt: state.expiresAt }),
	({ token, expiresAt }) => {
		const isAuthenticated = !!token && !!expiresAt && expiresAt > new Date();
		if (useAuthStore.getState().isAuthenticated !== isAuthenticated) {
			useAuthStore.setState({ isAuthenticated });
		}
	}
);

export default useAuthStore;
