import React from 'react';
import { View, Image } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { PriceDisplayProps } from './coindetails_types';
import { DEFAULT_TOKEN_ICON, formatValueChange, formatPrice } from './coindetails_scripts';
import { createStyles } from './coindetails_styles';


const PriceDisplay: React.FC<PriceDisplayProps> = ({
	price,
	periodChange,
	valueChange,
	period,
	icon_url,
	name,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	if (isNaN(periodChange)) return null;

	const isPositive = periodChange >= 0;
	const formattedPrice = `$${formatPrice(price)}`;
	const formattedChange = formatValueChange(valueChange, periodChange);

	return (
		<View style={styles.container}>
			<View style={styles.headerRow}>
				<Image
					source={{ uri: icon_url || DEFAULT_TOKEN_ICON }}
					alt={`${name || 'Token'} icon`}
					style={styles.icon}
					resizeMode="contain"
				/>
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
