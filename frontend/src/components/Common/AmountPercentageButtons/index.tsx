import React, { useState, useMemo } from 'react'; // Add useMemo
import { View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { AmountPercentageButtonsProps } from './types';
import { useStyles } from './styles'; // Using useStyles hook pattern

const percentages = [25, 50, 75, 100];

const AmountPercentageButtons: React.FC<AmountPercentageButtonsProps> = ({
	balance,
	onSelectAmount,
	style,
}) => {
	const styles = useStyles();
	const [activePercent, setActivePercent] = useState<number | null>(null);

	const containerStyle = useMemo(() => [
		styles.container, 
		style
	], [styles.container, style]);

	const handlePress = (percent: number) => {
		console.log(`[AmountPercentageButtons] Button ${percent}% pressed`);
		console.log(`[AmountPercentageButtons] Balance:`, balance);
		setActivePercent(percent);

		if (balance === undefined || balance === null || balance <= 0) {
			console.log(`[AmountPercentageButtons] No balance available, setting amount to 0`);
			onSelectAmount('0'); // Or handle as per original Send screen logic for no balance
			return;
		}

		const calculatedAmount = (balance * percent) / 100;
		console.log(`[AmountPercentageButtons] Calculated amount:`, calculatedAmount);
		// Formatting logic adapted from Send/index.tsx (turn 23)
		let amountStr = calculatedAmount.toFixed(9); // Max 9 decimal places
		amountStr = parseFloat(amountStr).toString(); // Removes trailing zeros after decimal

		// Length check from Send/index.tsx
		if (amountStr.length > 12) {
			amountStr = amountStr.substring(0, 12);
			if (amountStr.endsWith('.')) {
				amountStr = amountStr.substring(0, 11);
			}
		}
		console.log(`[AmountPercentageButtons] Final amount string:`, amountStr);
		onSelectAmount(amountStr);
	};

	return (
		<View style={containerStyle}>
			{percentages.map((percent) => {
				const isActive = activePercent === percent;

				// Create styles directly without useMemo inside the callback
				const buttonStyle = [
					styles.percentageButton,
					isActive ? styles.activeButton : undefined
				].filter(Boolean);

				const textStyle = [
					styles.percentageButtonText,
					isActive ? styles.activeButtonText : undefined
				].filter(Boolean);

				return (
					<TouchableOpacity
						key={percent}
						style={buttonStyle}
						onPress={() => handlePress(percent)}
						testID={`amount-percentage-button-${percent}`}
						accessible={true}
						accessibilityRole="button"
						accessibilityLabel={`${percent} percent button`}
					>
						<Text
							style={textStyle}
							testID={`amount-percentage-text-${percent}`}
							accessible={false}
						>
							{percent}%
						</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);
};

export default AmountPercentageButtons;
