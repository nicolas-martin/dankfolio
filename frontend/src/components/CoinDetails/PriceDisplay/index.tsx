import React from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { Text, useTheme, IconButton, Button } from 'react-native-paper';
import { PriceDisplayProps } from './coindetails_types';
import { useToast } from '@components/Common/Toast';
import { formatValueChange, formatPrice, formatAddress, copyToClipboard } from './coindetails_scripts';
import { createStyles } from './coindetails_styles';
import { useProxiedImage } from '@/hooks/useProxiedImage';
import { TokenImage } from '@/components/Common/TokenImage';

const PriceDisplay: React.FC<PriceDisplayProps> = ({
	price, periodChange, valueChange, period, iconUrl, name, address, hoveredPoint,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const { showToast } = useToast();

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
			<View style={{ flexDirection: 'row', alignItems: 'center' }}>
				<Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
					{formatAddress(address)}
				</Text>
				<IconButton
					icon="content-copy"
					size={16}
					onPress={() => copyToClipboard(address, 'Wallet', showToast)}
					style={{ margin: 0, padding: 0, marginLeft: 4 }}
				/>
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
						isPositive ? styles.changePositive : styles.changeNegative
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
			{/* {hoveredPoint && (
				<Text variant="bodySmall" style={styles.timestampText}>
					{format(new Date(hoveredPoint.timestamp), "EEEE MMM d 'at' h:mm a")}
				</Text>
			)} */}
		</View>
	);
};

export default PriceDisplay;
