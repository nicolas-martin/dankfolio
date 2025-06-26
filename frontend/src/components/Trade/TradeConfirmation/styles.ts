import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;

	return useMemo(() => {
		const colors = theme.colors;

		const tokenNameBase = {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.xs,
			marginLeft: theme.spacing.sm,
		};

		const recipientAddressLinkBase = {
			textDecorationLine: 'underline' as const,
		};

		const primaryColorTextBase = {
			color: colors.primary,
		};

		const solscanTextStyleBase = {
			fontSize: theme.typography.fontSize.xs,
			fontWeight: '500' as const,
		};

		const tokenIconBase = {
			borderRadius: theme.borderRadius.lg,
			height: theme.spacing['3xl'],
			marginRight: theme.spacing.lg,
			width: theme.spacing['3xl'],
		};

		const tokenIconPlaceholderBgBase = {
			backgroundColor: '#f0f0f0',
		};

		const styles = StyleSheet.create({
			actionSection: {
				paddingHorizontal: theme.spacing.xl,
				width: '100%',
			},
			amount: {
				color: colors.onSurface, // Use local colors variable
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
				marginBottom: 2,
			},
			amountInfo: {
				alignItems: 'flex-end',
				flex: 1,
			},
			amountRow: { // Legacy
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
			},
			amountSection: {
				alignItems: 'flex-end',
				flex: 1,
			},
			amountUsd: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
			},
			amountValue: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
			},
			blurViewStyle: {
				flex: 1,
			},
			bottomSheetBackground: {
				backgroundColor: theme.colors.surface,
			},
			button: {
				flex: 1,
			},
			buttonContainer: {
				flexDirection: 'row',
				gap: theme.spacing.lg,
			},
			cancelButton: {
				borderColor: theme.colors.outline,
				borderRadius: theme.borderRadius.lg,
				flex: 1,
				paddingVertical: theme.spacing.xs,
			},
			cancelButtonLabel: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
			},
			cardHeader: {
				alignItems: 'center',
				flexDirection: 'row',
				marginBottom: theme.spacing.md,
			},
			cardIcon: {
				alignItems: 'center',
				backgroundColor: theme.colors.primary,
				borderRadius: 14,
				height: 28,
				justifyContent: 'center',
				marginRight: 10,
				width: 28,
			},
			cardTitle: {
				color: theme.colors.onSurfaceVariant,
				flex: 1,
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '600',
			},
			coinDetails: {
				flex: 1,
			},
			coinIcon: {
				borderRadius: theme.spacing.xl,
				height: theme.spacing['4xl'],
				marginRight: theme.spacing.md,
				width: theme.spacing['4xl'],
			},
			coinInfo: {
				alignItems: 'center',
				flexDirection: 'row',
				flex: 1,
			},
			coinName: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
			},
			coinSymbol: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
				marginBottom: 2,
			},
			confirmButton: {
				backgroundColor: theme.colors.primary,
				borderRadius: theme.borderRadius.lg,
				flex: 1,
				paddingVertical: theme.spacing.xs,
			},
			confirmButtonLabel: {
				color: theme.colors.onPrimary,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
			},
			container: {
				flex: 1,
				padding: theme.spacing.xl,
			},
			divider: {
				backgroundColor: theme.colors.outline,
				height: 1,
				marginVertical: theme.spacing.sm,
				opacity: 0.2,
			},
			exchangeHeader: {
				alignItems: 'center',
				flexDirection: 'row',
				marginBottom: theme.spacing.sm,
			},
			exchangeIcon: {
				marginRight: 6,
			},
			exchangeRate: {
				color: theme.colors.primary,
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '600',
				textAlign: 'center',
			},
			exchangeSection: {
				backgroundColor: theme.colors.surface,
				borderColor: theme.colors.outline,
				borderRadius: theme.borderRadius.md,
				borderWidth: 1,
				marginBottom: theme.spacing.lg,
				padding: 14,
			},
			feeContainer: {
				alignItems: 'center',
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: theme.borderRadius.lg,
				flexDirection: 'row',
				justifyContent: 'space-between',
				marginBottom: theme.spacing['4xl'],
				padding: theme.spacing.xl,
			},
			feeHeader: {
				color: theme.colors.onSurfaceVariant,
				fontSize: 13,
				fontWeight: '600',
				marginBottom: 10,
			},
			feeLabel: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.base,
			},
			feeRow: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
				marginBottom: 6,
			},
			feeSection: {
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: theme.borderRadius.md,
				marginBottom: theme.spacing.lg,
				padding: 14,
			},
			feeValue: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
			},
			handleIndicator: {
				backgroundColor: theme.colors.onSurface,
			},
			header: {
				alignItems: 'center',
				marginBottom: theme.spacing['2xl'],
				paddingHorizontal: theme.spacing.xl,
			},
			label: {
				color: theme.colors.onSurfaceVariant,
			},
			loadingContainer: {
				alignItems: 'center',
				justifyContent: 'center',
				paddingHorizontal: theme.spacing.xl,
				paddingVertical: 60,
			},
			loadingText: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				marginTop: theme.spacing.xl,
				textAlign: 'center',
			},
			// Combined styles using composition - no duplication!
			placeholderIconStyle: {
				...tokenIconBase,
				...tokenIconPlaceholderBgBase,
			},
			primaryColorText: primaryColorTextBase,
			recipientAddressLink: recipientAddressLinkBase,
			recipientAddressTextStyle: {
				...tokenNameBase,
				...recipientAddressLinkBase,
				...primaryColorTextBase,
			},
			row: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
				marginBottom: theme.spacing.sm,
			},
			section: { // Legacy
				marginBottom: theme.spacing.lg,
			},
			solscanButton: {
				alignItems: 'center',
				flexDirection: 'row',
				gap: theme.spacing.xs,
				paddingHorizontal: theme.spacing.sm,
				paddingVertical: theme.spacing.xs,
			},
			solscanText: {
				...solscanTextStyleBase,
				...primaryColorTextBase,
			},
			solscanTextStyle: solscanTextStyleBase,
			subValue: { // Legacy
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs, // 12 is theme.typography.fontSize.xs
				marginTop: 2, // No exact match for 2
			},
			subtitle: { // Legacy
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				textAlign: 'center',
			},
			swapIconContainer: {
				alignItems: 'center',
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.lg,
				elevation: 2,
				height: theme.spacing['3xl'],
				justifyContent: 'center',
				left: '50%',
				position: 'absolute',
				shadowColor: theme.colors.onBackground,
				shadowOffset: theme.shadows.sm.shadowOffset,
				shadowOpacity: 0.1,
				shadowRadius: 2,
				top: '50%',
				transform: [{ translateX: -theme.spacing.lg }, { translateY: -theme.spacing.lg }],
				width: theme.spacing['3xl'],
			},
			title: {
				color: theme.colors.onSurface,
				fontSize: 22,
				fontWeight: '700',
				textAlign: 'center',
			},
			tokenDetails: {
				flex: 1,
			},
			// Use base styles directly
			tokenIcon: tokenIconBase,
			tokenIconPlaceholderBg: tokenIconPlaceholderBgBase,
			tokenInfo: {
				alignItems: 'center',
				flexDirection: 'row',
				flex: 1,
			},
			tokenName: tokenNameBase,
			tokenSection: {
				alignItems: 'center',
				flexDirection: 'row',
				flex: 1,
				marginRight: theme.spacing.lg,
			},
			tokenSymbol: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
				marginBottom: 2,
				marginLeft: theme.spacing.sm,
			},
			totalFeeLabel: {
				color: theme.colors.onSurface,
				fontSize: 13,
				fontWeight: '600',
			},
			totalFeeRow: {
				alignItems: 'center',
				borderTopColor: theme.colors.outline,
				borderTopWidth: 1,
				flexDirection: 'row',
				justifyContent: 'space-between',
				marginTop: theme.spacing.xs,
				paddingTop: 10,
			},
			totalFeeValue: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '700',
			},
			tradeCard: {
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: theme.borderRadius.lg,
				marginBottom: theme.spacing.sm,
				padding: theme.spacing.xl,
			},
			tradeCardsContainer: {
				marginBottom: theme.spacing.xl,
				position: 'relative',
			},
			tradeContainer: {
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: theme.borderRadius.lg,
				marginBottom: theme.spacing['2xl'],
				marginHorizontal: theme.spacing.xl,
				padding: theme.spacing.xl,
			},
			tradeRow: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
				paddingVertical: theme.spacing.lg,
			},
			value: {
				fontWeight: '600',
			},
			valueContainer: {
				alignItems: 'flex-end',
			},
		});
		return {
			...styles,
			colors: theme.colors,
			theme
		};
	}, [theme]);
};
