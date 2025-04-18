import React, { useState, useCallback, useMemo } from 'react';
import { View, Image, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { Modal, Portal, Text, useTheme, Card } from 'react-native-paper';
import { ChevronDownIcon, SearchIcon } from '@components/Common/Icons';
import { TokenSelectorProps, TokenSearchModalProps } from './types';
import { PortfolioToken } from '@store/portfolio';
import { createStyles } from './styles';

const TokenSearchModal: React.FC<TokenSearchModalProps> = ({
	visible,
	onDismiss,
	tokens,
	selectedToken,
	onSelectToken,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const [searchQuery, setSearchQuery] = useState('');

	const filteredTokens = tokens.filter(token =>
		token.coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
		token.coin.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const handleTokenSelect = useCallback((token: PortfolioToken) => {
		onSelectToken(token);
		// Small delay to prevent flickering
		requestAnimationFrame(() => {
			onDismiss();
		});
	}, [onSelectToken, onDismiss]);

	const renderItem = ({ item: token }: { item: PortfolioToken }) => (
		<TouchableOpacity
			style={styles.tokenItem}
			onPress={() => handleTokenSelect(token)}
		>
			<Image source={{ uri: token.coin.icon_url }} style={styles.tokenIcon} />
			<View style={styles.tokenDetails}>
				<Text style={styles.tokenSymbol}>{token.coin.symbol}</Text>
				<Text style={styles.tokenName}>{token.coin.name}</Text>
				<Text style={styles.tokenAddress}>
					{token.coin.id.slice(0, 6)}...{token.coin.id.slice(-6)}
				</Text>
			</View>
			<Text style={styles.tokenBalance}>{token.amount}</Text>
		</TouchableOpacity>
	);

	return (
		<Portal>
			<Modal
				visible={visible}
				onDismiss={onDismiss}
				contentContainerStyle={styles.modalContent}
				dismissable={true}
			>
				<View style={styles.searchContainer}>
					<TextInput
						style={styles.searchInput}
						placeholder="Search tokens"
						value={searchQuery}
						onChangeText={setSearchQuery}
						placeholderTextColor={theme.colors.onSurfaceVariant}
					/>
				</View>
				<FlatList
					data={filteredTokens}
					renderItem={renderItem}
					keyExtractor={token => token.id}
					style={styles.tokenList}
				/>
			</Modal>
		</Portal>
	);
};

const TokenSelector: React.FC<TokenSelectorProps> = ({
	selectedToken,
	tokens,
	onSelectToken,
	label,
	style,
	amountValue,
	onAmountChange,
	amountPlaceholder = '0.00',
	isAmountEditable = true,
	isAmountLoading = false,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const [modalVisible, setModalVisible] = useState(false);

	const handleDismiss = useCallback(() => {
		setModalVisible(false);
	}, []);

	const calculatedValue = useMemo(() => {
		if (selectedToken && amountValue && !isNaN(parseFloat(amountValue))) {
			return (parseFloat(amountValue) * selectedToken.price).toFixed(2);
		}
		return '0.00';
	}, [selectedToken, amountValue]);

	return (
		<>
			<Card elevation={0} style={[styles.cardContainer, style]}>
				<Card.Content style={styles.cardContent}>
					<TouchableOpacity
						style={styles.selectorButtonContainer}
						onPress={() => setModalVisible(true)}
						disabled={!onSelectToken}
					>
						<View style={styles.tokenInfo}>
							{selectedToken ? (
								<>
									<Image
										source={{ uri: selectedToken.coin.icon_url }}
										style={styles.tokenIcon}
									/>
									<Text style={styles.tokenSymbol}>
										{selectedToken.coin.symbol}
									</Text>
								</>
							) : (
								<Text style={styles.tokenSymbol}>{label || 'Select Token'}</Text>
							)}
						</View>
						<ChevronDownIcon size={20} color={theme.colors.onSurface} />
					</TouchableOpacity>

					{onAmountChange && (
						<View style={styles.inputContainer}>
							{isAmountLoading ? (
								<ActivityIndicator size="small" color={theme.colors.primary} style={{ height: styles.amountInput.height }} />
							) : (
								<TextInput
									style={styles.amountInput}
									value={amountValue}
									onChangeText={onAmountChange}
									placeholder={amountPlaceholder}
									placeholderTextColor={theme.colors.onSurfaceVariant}
									keyboardType="decimal-pad"
									editable={isAmountEditable}
								/>
							)}
							<Text style={styles.valueText}>
								{`$${calculatedValue}`}
							</Text>
						</View>
					)}
				</Card.Content>
			</Card>

			<TokenSearchModal
				visible={modalVisible}
				onDismiss={handleDismiss}
				tokens={tokens}
				selectedToken={selectedToken}
				onSelectToken={onSelectToken}
			/>
		</>
	);
};

export default TokenSelector; 