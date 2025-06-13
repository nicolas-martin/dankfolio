import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyle = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const colors = theme.colors; // Ensure colors is defined inside useMemo
		const styles = StyleSheet.create({
			container: {
				alignItems: 'center',
				backgroundColor: colors.background, // Use local colors variable
			flex: 1,
			justifyContent: 'center',
		},
		loadingText: {
			color: theme.colors.primary,
			fontSize: theme.typography.fontSize.lg,
			marginTop: 10, // No exact match
		},
		logo: {
			height: 200, // No exact match
			marginBottom: theme.spacing.xl,
			width: 200, // No exact match
		},
	});
	return {
		...styles,
		colors: theme.colors, // Return original theme.colors for consistency
		theme
	};
	}, [theme]);
};
