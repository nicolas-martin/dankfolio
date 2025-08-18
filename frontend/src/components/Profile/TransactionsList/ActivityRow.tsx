import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useCoinStore } from '@/store/coins';
import ActivityIcon from './ActivityIcon';
import { ActivityRowProps } from './activity_types';
import { shortAddress, formatFiat, formatTimeAgo } from './activity_utils';
import { formatTokenBalance } from '@/utils/numberFormat';
import { useStyles } from './activity_styles';

const ActivityRow: React.FC<ActivityRowProps> = ({
	item,
	onPress,
	onLongPress
}) => {
	const styles = useStyles();
	const { coinMap } = useCoinStore();

	// Get coin data for the tokens involved
	const mintInCoin = item.mintIn ? coinMap[item.mintIn] : undefined;
	const mintOutCoin = item.mintOut ? coinMap[item.mintOut] : undefined;

	// Determine display data based on action type
	const getDisplayData = () => {
		switch (item.action) {
			case 'received':
				return {
					title: 'Received',
					subtitle: item.counterparty ? `From ${shortAddress(item.counterparty)}` : '',
					baseTokenIcon: mintOutCoin?.logoURI || mintInCoin?.logoURI,
					actionBadgeType: 'arrow-down' as const,
					primaryAmount: item.amountOut || item.amountIn || 0,
					primarySymbol: mintOutCoin?.symbol || mintInCoin?.symbol || '',
					isPositive: true
				};

			case 'sent':
				return {
					title: 'Sent',
					subtitle: item.counterparty ? `To ${shortAddress(item.counterparty)}` : '',
					baseTokenIcon: mintInCoin?.logoURI || mintOutCoin?.logoURI,
					actionBadgeType: 'paper-plane' as const,
					primaryAmount: item.amountIn || item.amountOut || 0,
					primarySymbol: mintInCoin?.symbol || mintOutCoin?.symbol || '',
					isPositive: false
				};

			case 'swap':
				return {
					title: 'Swapped',
					subtitle: 'via Jupiter',
					baseTokenIcon: mintOutCoin?.logoURI,
					actionBadgeType: 'token-icon',
					actionBadgeIcon: mintInCoin?.logoURI,
					primaryAmount: item.amountOut || 0,
					primarySymbol: mintOutCoin?.symbol || '',
					secondaryAmount: item.amountIn || 0,
					secondarySymbol: mintInCoin?.symbol || '',
					isPositive: true
				};

			default:
				return {
					title: 'Transaction',
					subtitle: '',
					baseTokenIcon: undefined,
					actionBadgeType: 'arrow-down' as const,
					primaryAmount: 0,
					primarySymbol: '',
					isPositive: false
				};
		}
	};

	const displayData = getDisplayData();

	// Format primary amount with sign
	const formatPrimaryAmount = () => {
		const sign = displayData.isPositive ? '+' : '-';
		const formatted = formatTokenBalance(displayData.primaryAmount, 8);
		return `${sign}${formatted} ${displayData.primarySymbol}`;
	};

	// Format secondary amount for swaps
	const formatSecondaryAmount = () => {
		if (item.action === 'swap' && displayData.secondaryAmount && displayData.secondarySymbol) {
			const formatted = formatTokenBalance(displayData.secondaryAmount, 8);
			return `-${formatted} ${displayData.secondarySymbol}`;
		}

		// Show fiat if available for non-swap transactions
		if (item.fiat?.primary && item.fiat?.currency) {
			return formatFiat(item.fiat.primary, item.fiat.currency);
		}

		return null;
	};

	const handlePress = () => {
		onPress?.(item);
	};

	const handleLongPress = () => {
		onLongPress?.(item);
	};

	return (
		<TouchableOpacity
			onPress={handlePress}
			onLongPress={handleLongPress}
			activeOpacity={0.7}
		>
			<View style={styles.activityRow}>
				{/* Left: Icon stack */}
				<ActivityIcon
					baseTokenIcon={displayData.baseTokenIcon}
					actionBadgeIcon={displayData.actionBadgeIcon}
					actionBadgeType={displayData.actionBadgeType}
					size={36}
				/>

				{/* Middle: Text content */}
				<View style={styles.textContent}>
					<Text style={styles.title}>{displayData.title}</Text>
					<Text style={styles.subtitle}>{displayData.subtitle}</Text>
				</View>

				{/* Right: Amount and timestamp */}
				<View style={styles.rightColumn}>
					<Text style={styles.timestamp}>
						{formatTimeAgo(item.timestamp)}
					</Text>

					<Text
						style={[
							styles.primaryAmount,
							displayData.isPositive && styles.primaryAmountPositive
						]}
					>
						{formatPrimaryAmount()}
					</Text>

					{formatSecondaryAmount() && (
						<Text style={styles.secondaryAmount}>
							{formatSecondaryAmount()}
						</Text>
					)}

				</View>
			</View>
		</TouchableOpacity>
	);
};

export default ActivityRow;
