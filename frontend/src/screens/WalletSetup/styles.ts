import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		// const colors = theme.colors; // This variable was unused
		const styles = StyleSheet.create({
			actionButton: {
				alignItems: 'center',
				borderRadius: 24,
				height: 48,
				justifyContent: 'center',
				marginVertical: 6,
				width: '100%',
			},
			actionButtonLight: {
				backgroundColor: theme.colors.surfaceVariant,
			},
			actionButtonYellow: {
				backgroundColor: theme.colors.primary,
			},
			backButton: {
				alignItems: 'center',
				height: 40,
				justifyContent: 'center',
				width: 40,
			},
			backButtonText: {
				color: theme.colors.onSurface,
				fontSize: 24,
				fontWeight: '400',
			},
			buttonContainer: { // For welcome screen
				marginTop: 32,
				width: '100%',
			},
			buttonRow: {
				flexDirection: 'row',
				justifyContent: 'space-between',
				margin: 24,
			},
			buttonText: {
				color: theme.colors.background,
				fontFamily: 'Manrope',
				fontSize: 16,
				fontWeight: '700',
			},
			centeredContent: {
				alignItems: 'center',
			},
			confirmButtonContainer: {
				marginTop: 24,
				paddingBottom: 20,
				width: '100%',
			},
			container: {
				backgroundColor: theme.colors.background,
				flex: 1,
			},
			copyButton: {
				margin: 0,
				padding: 0,
			},
			createButtonContainer: { // For create screen
				bottom: 40,
				left: 24,
				position: 'absolute',
				right: 24,
			},
			createContainer: {
				backgroundColor: theme.colors.background,
				flex: 1,
			},
			createContent: {
				alignItems: 'center',
				flex: 1,
				paddingHorizontal: 24,
				paddingTop: 40,
			},
			debugText: {
				alignItems: 'center',
				backgroundColor: theme.colors.surface,
				color: theme.colors.onSurfaceVariant,
				marginBottom: 16,
				padding: 30,
				paddingLeft: 60
			},
			headerContainer: {
				alignItems: 'center',
				backgroundColor: theme.colors.surface,
				flexDirection: 'row',
				justifyContent: 'space-between',
				paddingBottom: 20,
				paddingHorizontal: 20,
				paddingTop: 60,
			},
			headerSpacer: {
				width: 40,
			},
			headerTitle: {
				color: theme.colors.onSurface,
				fontFamily: 'Manrope',
				fontSize: 18,
				fontWeight: '600',
				textAlign: 'center',
			},
			iconPlaceholder: {
				alignItems: 'center',
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: 24,
				height: 48,
				justifyContent: 'center',
				marginBottom: 16,
				width: 48,
			},
			importButtonContainer: {
				bottom: 40,
				left: 24,
				position: 'absolute',
				right: 24,
			},
			importContainer: {
				backgroundColor: theme.colors.background,
				flex: 1,
			},
			importContent: {
				alignItems: 'center',
				flex: 1,
				paddingHorizontal: 24,
				paddingTop: 40,
			},
			importRecoveryInput: {
				backgroundColor: theme.colors.surface,
				borderColor: theme.colors.outline,
				borderRadius: 12,
				borderWidth: 1,
				color: theme.colors.onSurface,
				flex: 1,
				fontSize: 16,
				marginTop: 32,
				maxHeight: 300,
				padding: 16,
				width: '100%',
			},
			loadingContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
				padding: 24,
			},
			mnemonicContainer: {
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: 12,
				marginTop: 16,
				padding: 16,
				width: '100%',
			},
			mnemonicGrid: {
				flexDirection: 'row',
				flexWrap: 'wrap',
				justifyContent: 'space-between',
			},
			mnemonicWord: {
				alignItems: 'center',
				flexDirection: 'row',
				marginBottom: 12,
				width: '48%',
			},
			neonBarImage: {
				height: '100%',
				width: '100%',
			},
			neonBarImageContainer: {
				flex: 1,
				overflow: 'hidden',
				width: '100%',
			},
			recoveryInput: {
				backgroundColor: theme.colors.surface,
				borderColor: theme.colors.outline,
				borderRadius: 12,
				borderWidth: 1,
				color: theme.colors.onSurface,
				fontSize: 16,
				margin: 16,
				padding: 15,
				width: '100%',
			},
			section: {
				alignItems: 'center',
				padding: 20,
			},
			spinnerContainer: {
				alignItems: 'center',
				height: 80,
				justifyContent: 'center',
				marginBottom: 24,
				width: 80,
			},
			subtitle: {
				color: theme.colors.onSurfaceVariant,
				fontFamily: 'Manrope',
				fontSize: 16,
				fontWeight: '400',
				lineHeight: 24,
				marginTop: 8,
				textAlign: 'center',
			},
			termsContainer: {
				backgroundColor: 'transparent',
				borderBottomColor: theme.colors.primary,
				borderBottomWidth: 1,
				borderRadius: 8,
				marginTop: 24,
				padding: 10,
			},
			termsText: {
				color: theme.colors.primary,
				fontFamily: 'Manrope',
				fontSize: 14,
				fontWeight: '400',
				marginTop: 24,
				paddingHorizontal: 20,
				textAlign: 'center',
			},
			title: {
				color: theme.colors.onBackground,
				fontFamily: 'Manrope',
				fontSize: 28,
				fontWeight: '700',
				lineHeight: 35,
				textAlign: 'center',
			},
			walletInfoCard: {
				backgroundColor: theme.colors.surface,
				borderColor: theme.colors.outline,
				borderRadius: 16,
				borderWidth: 1,
				marginTop: 24,
				padding: 16,
				width: '100%',
			},
			walletInfoHeader: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
				marginBottom: 8,
			},
			walletInfoLabel: {
				color: theme.colors.primary,
				fontFamily: 'Manrope',
				fontSize: 14,
				fontWeight: '600',
				marginBottom: 8,
			},
			walletInfoSection: {
				marginBottom: 16,
			},
			walletInfoValue: {
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: 8,
				color: theme.colors.onSurface,
				fontFamily: 'Manrope',
				fontSize: 14,
				fontWeight: '400',
				padding: 12,
			},
			welcomeContainer: {
				backgroundColor: theme.colors.background,
				flex: 1,
			},
			welcomeContent: {
				alignItems: 'center',
				backgroundColor: theme.colors.surface,
				borderTopLeftRadius: 24,
				borderTopRightRadius: 24,
				marginTop: -20,
				paddingBottom: 40,
				paddingHorizontal: 24,
				paddingTop: 32,
			},
			welcomeTextContainer: {
				alignItems: 'center',
				marginBottom: 32,
			},
			welcomeTextWrapper: {
				flex: 1,
				justifyContent: 'space-between',
				width: '100%',
			},
			wordNumber: {
				color: theme.colors.primary,
				fontFamily: 'Manrope',
				fontSize: 12,
				fontWeight: '600',
				width: 24,
			},
			wordText: {
				color: theme.colors.onSurface,
				flex: 1,
				fontFamily: 'Manrope',
				fontSize: 14,
				fontWeight: '500',
			},
		});
		return {
			...styles,
			colors: theme.colors, // Return original theme.colors for consistency
			theme
		};
	}, [theme]);
};
