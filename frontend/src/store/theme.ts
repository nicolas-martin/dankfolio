import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeType } from '@utils/theme';
import { logger } from '@/utils/logger';

const THEME_STORAGE_KEY = 'app_theme_preference';

interface ThemeStore {
	// State
	themeType: ThemeType;
	isLoading: boolean;

	// Actions
	toggleTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
	themeType: 'neon', // Default theme
	isLoading: false,

	toggleTheme: async () => {
		try {
			set({ isLoading: true });
			const currentTheme = get().themeType;
			const newTheme = currentTheme === 'light' ? 'neon' : 'light';

			logger.info(`ThemeStore: Toggling theme from ${currentTheme} to ${newTheme}`);

			// Update the store state first for immediate UI feedback
			set({ themeType: newTheme });

			// Then persist the change to storage
			await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
			logger.info(`ThemeStore: Theme preference saved to storage successfully`);
		} catch (error) {
			logger.error('ThemeStore: Error toggling theme', { error });
			// If we encounter an error, revert to the previous theme
			const currentTheme = get().themeType;
			const previousTheme = currentTheme === 'light' ? 'neon' : 'light';
			set({ themeType: previousTheme });
		} finally {
			set({ isLoading: false });
		}
	},

}));

 
