import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;

	return useMemo(() => {
		const createViewStyle = (containerStyle?: object) => [
			{
				alignItems: 'center' as const,
				flexDirection: 'row' as const,
			},
			containerStyle
		].filter(Boolean);

		const createIconStyle = (iconStyle?: object) => [
			{
				// Styles for CachedImage or Icon component can be passed via props if needed
			},
			iconStyle
		].filter(Boolean);

		const createTextContainerStyle = (textContainerStyle?: object, iconUri?: string) => [
			{
				flexDirection: 'column' as const,
				justifyContent: 'center' as const,
				marginLeft: theme.spacing.md, // Default spacing if icon is present
			},
			textContainerStyle,
			!iconUri ? { marginLeft: 0 } : undefined
		].filter(Boolean);

		const createPrimaryTextStyle = (primaryTextStyle?: object) => [
			{
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600' as const,
			},
			primaryTextStyle
		].filter(Boolean);

		const createSecondaryTextStyle = (secondaryTextStyle?: object) => [
			{
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				marginTop: 2, // Small spacing between primary and secondary text
			},
			secondaryTextStyle
		].filter(Boolean);
		const styles = StyleSheet.create({
			container: {
				alignItems: 'center',
				flexDirection: 'row',
			},
			icon: {
				// Styles for CachedImage or Icon component can be passed via props if needed
				// marginRight: theme.spacing.md, // Default spacing
			},
			noIconMargin: { // New style
				marginLeft: 0,
			},
			primaryText: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
			},
			secondaryText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				marginTop: 2, // Small spacing between primary and secondary text
			},
			textContainer: {
				flexDirection: 'column',
				justifyContent: 'center',
				marginLeft: theme.spacing.md, // Default spacing if icon is present
			},
		});

		return {
			...styles,
			createViewStyle,
			createIconStyle,
			createTextContainerStyle,
			createPrimaryTextStyle,
			createSecondaryTextStyle
		};
	}, [theme]);
};
