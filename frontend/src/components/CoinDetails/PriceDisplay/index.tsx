import React from 'react';
import { View, ActivityIndicator } from 'react-native'; // ActivityIndicator might become unused here
import { Text, useTheme, IconButton } from 'react-native-paper';
import { PriceDisplayProps } from './coindetails_types';
import { useToast } from '@components/Common/Toast';
import { formatPrice, formatValueChange } from '@/utils/numberFormat';
import { copyToClipboard, formatAddress } from './coindetails_scripts';
import { createStyles } from './coindetails_styles';
// import { useProxiedImage } from '@/hooks/useProxiedImage'; // Removed
import { TokenImage } from '@/components/Common/TokenImage';
import Odometer from '@components/Odometer';

const PriceDisplay: React.FC<PriceDisplayProps> = ({
	price, periodChange, valueChange, period, iconUrl, name, address, hoveredPoint,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const { showToast } = useToast();

	// const { imageUri, isLoading } = useProxiedImage(iconUrl); // Removed

	if (isNaN(periodChange)) return null;

	const isPositive = periodChange >= 0;
	const formattedPrice = formatPrice(price);
	const formattedChange = formatValueChange(valueChange, periodChange);

	return (
		<View style={styles.container}>
			{/* Header with coin info */}
			<View style={styles.headerRow}>
				{iconUrl ? (
					<TokenImage uri={iconUrl} size={40} />
				) : (
					// Render a placeholder if no iconUrl is provided.
					// TokenImage will handle its own loading indicator if iconUrl is valid.
					// Assuming styles.icon might not have dimensions, explicitly setting them.
					<View style={[styles.icon, { width: 40, height: 40 }]} />
				)}
				{name && (
					<Text style={styles.nameText}>
						{name}
					</Text>
				)}
			</View>

			{/* Address row */}
			<View style={styles.addressRow}>
				<Text style={styles.addressText}>
					{formatAddress(address)}
				</Text>
				<IconButton
					icon="content-copy"
					size={16}
					onPress={() => copyToClipboard(address, 'Address', showToast)}
					style={{ margin: 0, padding: 0, marginLeft: 8 }}
				/>
			</View>

			{/* Price */}
			<Odometer
				value={formattedPrice}
				duration={1000}
				fontStyle={{ fontSize: 32, fontVariant: ['tabular-nums'] }}
			/>

			{/* Change and period */}
			<View style={styles.changeRow}>
				<Text
					style={[
						styles.changeText,
						isPositive ? styles.changePositive : styles.changeNegative
					]}
				>
					{formattedChange}
				</Text>
				<Text style={[styles.periodText, { color: theme.colors.onSurfaceVariant }]}>
					{period}
				</Text>
			</View>

			{/* Timestamp for hovered point */}
			{/* {hoveredPoint && (
				<Text style={styles.timestampText}>
					{format(new Date(hoveredPoint.timestamp), "EEEE MMM d 'at' h:mm a")}
				</Text>
			)} */}
		</View>
	);
};

export default PriceDisplay;

