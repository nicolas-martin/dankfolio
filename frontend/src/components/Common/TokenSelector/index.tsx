import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Image, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { Modal, Portal, Text, useTheme, Card } from 'react-native-paper';
import { ChevronDownIcon } from '@components/Common/Icons';
import { TokenSelectorProps, TokenSearchModalProps } from './types';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { Coin } from '@/types';
import { createStyles } from './styles';
import { handleAmountInputChange, calculateUsdValue, findPortfolioToken } from './scripts';

const TokenSearchModal: React.FC<TokenSearchModalProps> = ({
	visible,
	onDismiss,
	selectedToken,
	onSelectToken,
	showOnlyPortfolioTokens = false,
	testID,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const [searchQuery, setSearchQuery] = useState('');
	const { tokens: portfolioTokens } = usePortfolioStore();
	const { availableCoins } = useCoinStore();

	const filteredCoins = useMemo(() => {
		let coins = showOnlyPortfolioTokens
			? availableCoins.filter(coin => portfolioTokens.some(token => token.id === coin.id))
			: availableCoins;

		return coins.filter(coin =>
			coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
			coin.name.toLowerCase().includes(searchQuery.toLowerCase())
		);
	}, [availableCoins, searchQuery, showOnlyPortfolioTokens, portfolioTokens]);

	const handleTokenSelect = useCallback((coin: Coin) => {
		onSelectToken(coin);
		// Small delay to prevent flickering
		requestAnimationFrame(() => {
			onDismiss();
		});
	}, [onSelectToken, onDismiss]);

	useEffect(() => {
		console.log('[TokenSearchModal] Visibility changed:', visible);
	}, [visible]);

	const renderItem = ({ item: coin }: { item: Coin }) => {
		const portfolioToken = portfolioTokens.find(t => t.id === coin.id);
		return (
			<TouchableOpacity
				style={styles.tokenItem}
				onPress={() => handleTokenSelect(coin)}
			>
				<Image source={{ uri: coin.icon_url }} style={styles.tokenIcon} />
				<View style={styles.tokenDetails}>
					<Text style={styles.tokenSymbol}>{coin.symbol}</Text>
					<Text style={styles.tokenName}>{coin.name}</Text>
					<Text style={styles.tokenAddress}>
						{coin.id.slice(0, 6)}...{coin.id.slice(-6)}
					</Text>
				</View>
				{portfolioToken && (
					<Text style={styles.tokenBalance}>{portfolioToken.amount}</Text>
				)}
			</TouchableOpacity>
		);
	};

	return (
		<Portal>
			<Modal
				visible={visible}
				onDismiss={() => {
					console.log('[TokenSearchModal] Modal onDismiss triggered');
					// Call onDismiss directly without requestAnimationFrame
					onDismiss();
				}}
				contentContainerStyle={styles.modalContent}
				dismissable={true}
				testID={testID}
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
					data={filteredCoins}
					renderItem={renderItem}
					keyExtractor={coin => coin.id}
					style={styles.tokenList}
				/>
			</Modal>
		</Portal>
	);
};

const TokenSelector: React.FC<TokenSelectorProps> = ({
	selectedToken,
	onSelectToken,
	label,
	style,
	amountValue,
	onAmountChange,
	isAmountEditable = true,
	isAmountLoading = false,
	showOnlyPortfolioTokens = false,
	testID,
}) => {
	const amountPlaceholder = '0.00';
	const theme = useTheme();
	const styles = createStyles(theme);
	const [modalVisible, setModalVisible] = useState(false);
	const { tokens: portfolioTokens } = usePortfolioStore();

	const calculatedValue = useMemo(() => {
		return calculateUsdValue(selectedToken, amountValue);
	}, [selectedToken, amountValue]);

	const portfolioToken = useMemo(() => {
		return findPortfolioToken(selectedToken, portfolioTokens);
	}, [selectedToken, portfolioTokens]);

	// Effect to handle default token selection
	useEffect(() => {
		if (selectedToken && onSelectToken && !portfolioToken) {
			// Only call onSelectToken if we don't already have this token in our portfolio
			onSelectToken(selectedToken);
		}
	}, [selectedToken, onSelectToken, portfolioToken]); // Add proper dependencies

	const handleDismiss = useCallback(() => {
		console.log('[TokenSelector] handleDismiss called');
		setModalVisible(false);
	}, []);

	return (
		<>
			<Card elevation={0} style={[styles.cardContainer, style]}>
				<Card.Content style={styles.cardContent}>
					<TouchableOpacity
						style={styles.selectorButtonContainer}
						onPress={() => {
							console.log('[TokenSelector] Opening modal');
							setModalVisible(true);
						}}
						disabled={!onSelectToken}
						testID={testID}
					>
						<View style={styles.tokenInfo}>
							{selectedToken ? (
								<>
									<Image
										source={{ uri: selectedToken.icon_url }}
										style={styles.tokenIcon}
									/>
									<Text style={styles.tokenSymbol}>
										{selectedToken.symbol}
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
								<ActivityIndicator
									size="small"
									color={theme.colors.primary}
									style={{ height: styles.amountInput.height }}
									testID="activity-indicator"
								/>
							) : (
								<TextInput
									style={styles.amountInput}
									value={amountValue}
									onChangeText={(text) => onAmountChange && handleAmountInputChange(text, onAmountChange)}
									placeholder={amountPlaceholder}
									placeholderTextColor={theme.colors.onSurfaceVariant}
									keyboardType="decimal-pad"
									editable={isAmountEditable}
								/>
							)}
							<Text style={styles.valueText}>
								{`$${calculatedValue}`}
							</Text>
							{portfolioToken && (
								<Text style={styles.valueText}>
									{portfolioToken.amount}
								</Text>
							)}
						</View>
					)}
				</Card.Content>
			</Card>

			<TokenSearchModal
				visible={modalVisible}
				onDismiss={handleDismiss}
				selectedToken={selectedToken}
				onSelectToken={onSelectToken}
				showOnlyPortfolioTokens={showOnlyPortfolioTokens}
				testID="token-search-modal"
			/>
		</>
	);
};

export default TokenSelector; 
