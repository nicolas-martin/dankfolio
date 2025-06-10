import React from 'react';
import { View, Text, TextInput } from 'react-native';
import type { TokenSelectorProps } from '@components/Common/TokenSelector/types';

const TokenSelector: React.FC<TokenSelectorProps> = ({
	selectedToken,
	_onSelectToken,
	label,
	style,
	amountValue,
	onAmountChange,
	isAmountEditable = true,
	isAmountLoading = false,
	testID,
}) => {
	// Get the parent text from the testID prop for consistent test querying
	const parentText = testID?.includes('from') ? 'from' : testID?.includes('to') ? 'to' : 'unknown';
	const inputTestID = `token-selector-input-${parentText}`;

	return (
		<View testID={`mock-TokenSelector-${parentText}`} style={style}>
			<Text>{label || selectedToken?.symbol || 'Select Token'}</Text>
			{onAmountChange && (
				<TextInput
					testID={inputTestID}
					value={amountValue}
					onChangeText={onAmountChange}
					placeholder="Enter amount"
					keyboardType="numeric"
					editable={isAmountEditable && !isAmountLoading}
				/>
			)}
			<Text>TokenSelector</Text>
		</View>
	);
};

export default TokenSelector; 