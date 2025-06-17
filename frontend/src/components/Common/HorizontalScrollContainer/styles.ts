import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	
	return useMemo(() => {
		const styles = StyleSheet.create({
			container: {
				// Minimal container styling - let parent handle spacing
			},
			listContentContainer: {
				// Default content container - can be overridden
			},
		});
		
		return {
			...styles,
			colors: theme.colors,
			theme,
		};
	}, [theme]);
}; 