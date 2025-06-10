import React, { useState } from 'react'; // Added useState
import { View, TouchableOpacity } from 'react-native'; // Added TouchableOpacity
import { Text, useTheme, IconButton } from 'react-native-paper';
import { PriceDisplayProps } from './coindetails_types';
import { useToast } from '@components/Common/Toast';
import { formatPrice, formatValueChange, formatAddress } from '@/utils/numberFormat';
import { copyToClipboard } from './coindetails_scripts';
import { createStyles } from './coindetails_styles';
import { CachedImage } from '@/components/Common/CachedImage';
import Odometer from '@components/Odometer';

import ImageZoomModal from '@/components/Common/ImageZoomModal'; // Added ImageZoomModal import

const PriceDisplay: React.FC<PriceDisplayProps> = ({
	price, periodChange, valueChange, period, resolvedIconUrl, name, address,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const { showToast } = useToast();
	const [isZoomModalVisible, setIsZoomModalVisible] = useState(false); // Added state for modal

	// Early return with a placeholder if any required values are invalid
	if (isNaN(price) || price === null || price === undefined) {
		// Return a static display instead of null to prevent layout shifts
		return (
			<View style={styles.container} testID="price-display-container">
				{/* Header with coin info */}
				<View style={styles.headerRow}>
					<TouchableOpacity onPress={() => setIsZoomModalVisible(true)} activeOpacity={0.8}>
						<CachedImage
							uri={resolvedIconUrl}
							size={40}
							borderRadius={20}
							showLoadingIndicator={true}
							style={styles.icon}
							testID="price-display-coin-icon"
						/>
					</TouchableOpacity>
					{name && (
						<Text style={styles.nameText} testID="price-display-coin-name">
							{name}
						</Text>
					)}
				</View>

				{/* Address row */}
				<View style={styles.addressRow}>
					<Text style={styles.addressText} testID="price-display-coin-address">
						{formatAddress(address, 8, 4)}
					</Text>
					<IconButton
						icon="content-copy"
						size={16}
						onPress={() => copyToClipboard(address, 'Address', showToast)}
						style={styles.copyIconStyle}
						testID="price-display-copy-address-button"
					/>
				</View>

				{/* Price placeholder */}
				<Text style={styles.pricePlaceholderText} testID="price-display-price-placeholder">$---.--</Text>
			</View>
		);
	}

	// Calculate derived values only after validation
	const isPositive = !isNaN(periodChange) && periodChange >= 0;
	const formattedPrice = formatPrice(price);
	const formattedChange = !isNaN(periodChange) && !isNaN(valueChange)
		? formatValueChange(valueChange, periodChange)
		: '---';

	return (
		<View style={styles.container} testID="price-display-container">
			{/* Header with coin info */}
			<View style={styles.headerRow}>
				<TouchableOpacity onPress={() => setIsZoomModalVisible(true)} activeOpacity={0.8}>
					<CachedImage
						uri={resolvedIconUrl}
						size={40}
						borderRadius={20}
						showLoadingIndicator={true}
						style={styles.icon}
						testID="price-display-coin-icon"
					/>
				</TouchableOpacity>
				{name && (
					<Text style={styles.nameText} testID="price-display-coin-name">
						{name}
					</Text>
				)}
			</View>

			{/* Address row */}
			<View style={styles.addressRow}>
				<Text style={styles.addressText} testID="price-display-coin-address">
					{formatAddress(address, 8, 4)}
				</Text>
				<IconButton
					icon="content-copy"
					size={16}
					onPress={() => copyToClipboard(address, 'Address', showToast)}
					style={styles.copyIconStyle}
					testID="price-display-copy-address-button"
				/>
			</View>

			{/* Price */}
			<View testID="price-display-current-price">
				<Odometer
					value={formattedPrice}
					duration={400}
					fontStyle={styles.odometerFontStyle}
				/>
			</View>

			{/* Change and period */}
			<View style={styles.changeRow}>
				<Text
					style={[
						styles.changeText,
						isPositive ? styles.changePositive : styles.changeNegative
					]}
					testID="price-display-price-change"
				>
					{formattedChange}
				</Text>
				<Text style={[styles.periodText, { color: theme.colors.onSurfaceVariant }]} testID="price-display-period">
					{period}
				</Text>
			</View>

			{/* Timestamp for hovered point */}
			{/* {hoveredPoint && (
                <Text style={styles.timestampText}>
                    {format(new Date(hoveredPoint.timestamp), "EEEE MMM d 'at' h:mm a")}
                </Text>
            )} */}
			<ImageZoomModal
				isVisible={isZoomModalVisible}
				onClose={() => setIsZoomModalVisible(false)}
				imageUri={resolvedIconUrl}
			/>
		</View>
	);
};

export default PriceDisplay;
