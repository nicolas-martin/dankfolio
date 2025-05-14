import React from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { PriceDisplayProps } from './coindetails_types';
import { formatValueChange, formatPrice } from './coindetails_scripts';
import { createStyles } from './coindetails_styles';
import { useProxiedImage } from '@/hooks/useProxiedImage';
import { TokenImage } from '@/components/Common/TokenImage';

const PriceDisplay: React.FC<PriceDisplayProps> = ({
	price,
	periodChange,
	valueChange,
	period,
	iconUrl,
	name,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	const { imageUri, isLoading } = useProxiedImage(iconUrl);

	if (isNaN(periodChange)) return null;

	const isPositive = periodChange >= 0;
	const formattedPrice = `${formatPrice(price)}`;
	const formattedChange = formatValueChange(valueChange, periodChange);

	return (
		<View style={styles.container}>
			<View style={styles.headerRow}>
				{isLoading ? (
					<View style={[styles.icon, { justifyContent: 'center', alignItems: 'center' }]}>
						<ActivityIndicator size="small" />
					</View>
				) : imageUri ? (
					<TokenImage uri={iconUrl} size={40} />
				) : (
					<View style={styles.icon} />
				)}
				{name && (
					<Text
						variant="titleLarge"
						style={[styles.nameText, { color: theme.colors.onSurface }]}
					>
						{name}
					</Text>
				)}
			</View>
			<Text
				variant="displaySmall"
				style={[styles.priceText, { color: theme.colors.onSurface }]}
			>
				{formattedPrice}
			</Text>
			<View style={styles.changeRow}>
				<Text
					variant="titleMedium"
					style={[
						styles.changeText,
						{ color: isPositive ? theme.colors.primary : theme.colors.error }
					]}
				>
					{formattedChange}
				</Text>
				<Text
					variant="bodyMedium"
					style={[styles.periodText, { color: theme.colors.onSurfaceVariant }]}
				>
					{period}
				</Text>
			</View>
		</View>
	);
};

export default PriceDisplay;
