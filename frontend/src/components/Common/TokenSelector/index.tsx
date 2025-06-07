import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, TouchableOpacity, FlatList, Modal as RNModal, TextInput, ActivityIndicator } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { ChevronDownIcon, CoinsIcon } from '@components/Common/Icons';
import { TokenSelectorProps, TokenSearchModalProps } from './types';
import { createStyles } from './styles';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { Coin } from '@/types';
import { calculateUsdValue, findPortfolioToken, handleAmountInputChange } from './scripts';
import { CachedImage } from '@/components/Common/CachedImage';

const DefaultTokenIcon = () => {
	const theme = useTheme();
	return <CoinsIcon size={24} color={theme.colors.primary} />;
};

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

	const baseList = useMemo(() => {
		return showOnlyPortfolioTokens
			? portfolioTokens.map(token => token.coin)
			: availableCoins;
	}, [showOnlyPortfolioTokens, portfolioTokens, availableCoins]);

	const filteredCoins = useMemo(() => {
		if (!searchQuery) return baseList;

		return baseList.filter(coin =>
			coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
			coin.name.toLowerCase().includes(searchQuery.toLowerCase())
		);
	}, [baseList, searchQuery]);

	const handleTokenSelect = useCallback((coin: Coin) => {
		onSelectToken(coin);
		onDismiss();
	}, [onSelectToken, onDismiss]);

	// Inline component for rendering the icon using CachedImage
	const RenderIcon: React.FC<{ iconUrl: string | undefined }> = React.memo(({ iconUrl }) => {
		return (
			<CachedImage
				uri={iconUrl}
				size={24}
				borderRadius={12}
				showLoadingIndicator={true}
				style={styles.tokenIcon}
			/>
		);
	});

	const renderItem = useCallback(({ item: coin }: { item: Coin }) => {
		const portfolioToken = portfolioTokens.find(t => t.mintAddress === coin.mintAddress);
		return (
			<TouchableOpacity
				style={styles.tokenItem}
				onPress={() => handleTokenSelect(coin)}
			>
				{/* Use the inline RenderIcon component */}
				<RenderIcon iconUrl={coin.resolvedIconUrl} />
				<View style={styles.tokenDetails}>
					<Text style={styles.tokenSymbol}>{coin.symbol}</Text>
					<Text style={styles.tokenName}>{coin.name}</Text>
					<Text style={styles.tokenAddress}>
						{coin.mintAddress.slice(0, 6)}...{coin.mintAddress.slice(-6)}
					</Text>
				</View>
				{portfolioToken && (
					<Text style={styles.tokenBalance}>{portfolioToken.amount}</Text>
				)}
			</TouchableOpacity>
		);
	}, [handleTokenSelect, styles.tokenItem, styles.tokenIcon, styles.tokenDetails, styles.tokenAddress, styles.tokenBalance, portfolioTokens]);

	return (
		<RNModal
			visible={visible}
			animationType="fade"
			transparent
			onRequestClose={onDismiss}
			testID={testID}
		>
			<TouchableOpacity
				style={styles.modalOverlay}
				activeOpacity={1}
				onPressOut={onDismiss}
			>
				<View style={styles.modalContent}>
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
						keyExtractor={coin => coin.mintAddress}
						style={styles.tokenList}
						keyboardShouldPersistTaps="handled"
					/>
				</View>
			</TouchableOpacity>
		</RNModal>
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
	const amountPlaceholder = 'Enter amount';
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

	const [hasInitialSelection, setHasInitialSelection] = useState(false);

	useEffect(() => {
		if (selectedToken && onSelectToken && !portfolioToken && !hasInitialSelection) {
			console.log('🎯 Initial token selection:', selectedToken.symbol);
			setHasInitialSelection(true);
			onSelectToken(selectedToken);
		}
	}, [selectedToken, onSelectToken, portfolioToken, hasInitialSelection]);

	const handleDismiss = useCallback(() => {
		setModalVisible(false);
	}, []);

	return (
		<>
			<Card elevation={0} style={[styles.cardContainer, style]}>
				<Card.Content style={styles.cardContent}>
					<TouchableOpacity
						style={styles.selectorButtonContainer}
						onPress={() => {
							setModalVisible(true);
						}}
						disabled={!onSelectToken}
						testID={testID}
					>
						<View style={styles.tokenInfo}>
							{selectedToken ? (
								<>
									<CachedImage
										uri={selectedToken.resolvedIconUrl}
										size={24}
										borderRadius={12}
										showLoadingIndicator={true}
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

			{modalVisible && (
				<TokenSearchModal
					visible={modalVisible}
					onDismiss={handleDismiss}
					selectedToken={selectedToken}
					onSelectToken={onSelectToken}
					showOnlyPortfolioTokens={showOnlyPortfolioTokens}
					testID="token-search-modal"
				/>
			)}
		</>
	);
};

export default TokenSelector; 
