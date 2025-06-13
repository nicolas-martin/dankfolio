import React, { useState } from 'react'; // Added useState
import { View, TouchableOpacity } from 'react-native'; // Added TouchableOpacity
import { Text, IconButton } from 'react-native-paper';
import { PriceDisplayProps } from './coindetails_types';
import { formatPrice, formatValueChange, formatAddress } from '@/utils/numberFormat';
import { useStyles } from './coindetails_styles';
import CachedImage from '@/components/Common/CachedImage';
import CopyToClipboard from '@/components/Common/CopyToClipboard';
import Odometer from '@components/Odometer';

import ImageZoomModal from '@/components/Common/ImageZoomModal'; // Updated import path

const PriceDisplay: React.FC<PriceDisplayProps> = ({
	price, periodChange, valueChange, period, resolvedIconUrl, name, address,
}) => {
	const styles = useStyles();
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
					<CopyToClipboard text={address} testID="price-display-copy-address-button">
						<IconButton
							icon="content-copy"
							size={16}
							style={styles.copyIconStyle}
						/>
					</CopyToClipboard>
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
				<CopyToClipboard text={address} testID="price-display-copy-address-button">
					<IconButton
						icon="content-copy"
						size={16}
						style={styles.copyIconStyle}
					/>
				</CopyToClipboard>
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
				<Text style={[styles.periodText, { color: styles.colors.onSurfaceVariant }]} testID="price-display-period">
					{period}
				</Text>
			</View>

			<ImageZoomModal
				isVisible={isZoomModalVisible}
				onClose={() => setIsZoomModalVisible(false)}
				imageUri={resolvedIconUrl}
			/>
		</View>
	);
};

export default PriceDisplay;
