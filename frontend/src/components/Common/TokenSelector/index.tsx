import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Card, Text, Searchbar } from 'react-native-paper'; // Added IconButton
import { BottomSheetModal, BottomSheetFlatList, BottomSheetBackdrop, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { ChevronDownIcon, ChangeIcon } from '@components/Common/Icons';
import { TokenSelectorProps, TokenSearchModalProps } from './types';
import { useStyles } from './styles';
import { usePortfolioStore, PortfolioToken } from '@store/portfolio';
import { useCoinStore } from '@store/coins'; // Already here, good.
import type { Coin } from '@/types';
import type { InputUnit } from '@/screens/Trade/types';
import { findPortfolioToken, handleAmountInputChange } from './scripts';
import CachedImage from '@/components/Common/CachedImage';
import { logger } from '@/utils/logger';
import { useNamedDepsDebug } from '@/utils/debugHooks';
import { formatTokenBalance, formatPrice } from '@/utils/numberFormat';
const RenderIcon = React.memo<{ iconUrl: string; styles: ReturnType<typeof useStyles> }>(({ iconUrl, styles }) => (
	<CachedImage
		uri={iconUrl}
		size={24}
		showLoadingIndicator={true}
		style={styles.tokenIcon}
	/>
));
RenderIcon.displayName = 'RenderIcon';

// Memoized TokenItem component to prevent unnecessary re-renders
const TokenItem = React.memo<{
	coin: Coin;
	portfolioToken: { amount: number } | undefined;
	onSelect: (coin: Coin) => void;
	styles: ReturnType<typeof useStyles>;
}>(({ coin, portfolioToken, onSelect, styles }) => {
	const handlePress = useCallback(() => {
		onSelect(coin);
	}, [coin, onSelect]);

	if (!coin.logoURI) {
		logger.warn('TokenItem: Missing logoURI for coin', coin.address);
		return
	}

	return (
		<TouchableOpacity
			testID={`search-result-${coin.symbol.toLowerCase()}`}
			style={styles.tokenItem}
			onPress={handlePress}
			accessible={true}
			accessibilityRole="button"
			accessibilityLabel={`Select ${coin.symbol.toLowerCase()} token`}
			accessibilityHint="Double tap to select this token"
			importantForAccessibility="yes"
		>
			<RenderIcon iconUrl={coin.logoURI} styles={styles} />
			<View style={styles.tokenDetails}>
				<Text style={styles.tokenSymbol}>{coin.symbol}</Text>
				<Text style={styles.tokenName}>{coin.name}</Text>
				<Text style={styles.tokenAddress}>
					{coin.address ? `${coin.address.slice(0, 6)}...${coin.address.slice(-6)}` : 'N/A'}
				</Text>
			</View>
			{portfolioToken && (
				<Text style={styles.tokenBalance}>{formatTokenBalance(portfolioToken.amount, 4)}</Text>
			)}
		</TouchableOpacity>
	);
});
TokenItem.displayName = 'TokenItem';

const TokenSearchModal: React.FC<TokenSearchModalProps> = ({
	visible,
	onDismiss,
	selectedToken: __selectedToken,
	onSelectToken,
	showOnlyPortfolioTokens = false,
	testID: __testID,
}) => {
	// Unused props - satisfying linter
	void __selectedToken;
	void __testID;

	const styles = useStyles();
	const bottomSheetModalRef = useRef<BottomSheetModal>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const { tokens: portfolioTokens } = usePortfolioStore();
	const { availableCoins, fetchAvailableCoins } = useCoinStore();

	// Lazy load available coins when modal opens and we need them
	useEffect(() => {
		if (visible && !showOnlyPortfolioTokens && availableCoins.length === 0) {
			logger.info('[TokenSelector] Lazy loading available coins for token selection');
			fetchAvailableCoins().catch(err => {
				logger.error('[TokenSelector] Failed to fetch available coins:', err);
			});
		}
	}, [visible, showOnlyPortfolioTokens, availableCoins.length, fetchAvailableCoins]);

	// Handle BottomSheetModal presentation
	useEffect(() => {
		if (visible) {
			bottomSheetModalRef.current?.present();
		} else {
			bottomSheetModalRef.current?.dismiss();
		}
	}, [visible]);

	// Memoize base list to prevent unnecessary recalculations
	const baseList = useMemo(() => {
		const list = showOnlyPortfolioTokens
			? portfolioTokens.map(token => token.coin)
			: availableCoins;
		logger.info(`[TokenSearchModal] baseList updated: ${list.length} coins, showOnlyPortfolioTokens: ${showOnlyPortfolioTokens}`);
		return list;
	}, [showOnlyPortfolioTokens, portfolioTokens, availableCoins]);

	// Optimized filtering with stable references to prevent flicker
	const filteredCoins = useMemo(() => {
		const maxResults = 100; // Limit for performance

		if (!searchQuery.trim()) {
			// Return first 50 coins when no search - stable reference
			const result = baseList.slice(0, 50);
			logger.info(`[TokenSearchModal] filteredCoins (no search): ${result.length} coins`);
			return result;
		}

		const query = searchQuery.toLowerCase().trim();
		const filtered = baseList.filter((coin: Coin) =>
			coin.symbol.toLowerCase().includes(query) ||
			coin.name.toLowerCase().includes(query)
		);

		// Limit search results and ensure stable reference
		const result = filtered.slice(0, maxResults);
		logger.info(`[TokenSearchModal] filteredCoins (search: "${query}"): ${result.length} coins`);
		return result;
	}, [baseList, searchQuery]);

	// Memoize token selection handler
	const handleTokenSelect = useCallback((coin: Coin) => {
		onSelectToken(coin);
		onDismiss();
	}, [onSelectToken, onDismiss]);

	// Memoize backdrop component
	const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => (
		<BottomSheetBackdrop
			{...props}
			disappearsOnIndex={-1}
			appearsOnIndex={0}
			opacity={0.8}
			onPress={onDismiss}
			accessible={true}
			accessibilityRole="button"
			accessibilityLabel="Close token selection modal"
			accessibilityHint="Tap to close the modal"
		>
			<BlurView intensity={20} style={styles.blurView} />
		</BottomSheetBackdrop>
	), [onDismiss, styles.blurView]);

	// Create a memoized map for faster portfolio token lookup
	const portfolioTokenMap = useMemo(() => {
		const map = new Map<string, PortfolioToken>();
		portfolioTokens.forEach((token: PortfolioToken) => {
			// Map using the coin's address (which is the new property name) 
			// but PortfolioToken still uses mintAddress for now
			map.set(token.coin.address, token);
		});
		return map;
	}, [portfolioTokens]);

	// Debug what causes renderItem to recreate
	useNamedDepsDebug({
		handleTokenSelect,
		portfolioTokenMap,
	}, 'renderItem');

	// Memoize render item function (styles is memoized and stable, safe to omit from deps)
	const renderItem = useCallback(({ item: coin }: { item: Coin }) => {
		logger.info('renderItem', coin);
		const portfolioToken = portfolioTokenMap.get(coin.address);

		return (
			<TokenItem
				coin={coin}
				portfolioToken={portfolioToken}
				onSelect={handleTokenSelect}
				styles={styles}
			/>
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [handleTokenSelect, portfolioTokenMap]);

	// Memoize key extractor with modal prefix to ensure uniqueness
	const keyExtractor = useCallback((coin: Coin) => `token-modal-${coin.address}`, []);

	// Memoize search query change handler with throttling
	const handleSearchQueryChange = useCallback((query: string) => {
		setSearchQuery(query);
	}, []);

	const modalBackgroundStyle = useMemo(() => ({
		backgroundColor: styles.colors.surface
	}), [styles.colors.surface]);

	const modalHandleStyle = useMemo(() => ({
		backgroundColor: styles.colors.onSurface
	}), [styles.colors.onSurface]);

	const getItemLayout = useCallback((data: Coin[] | null, index: number) => ({
		length: 72, // Approximate height of each token item
		offset: 72 * index,
		index,
	}), []);

	const snapPoints = useMemo(() => ['75%'], []);

	return (
		<BottomSheetModal
			ref={bottomSheetModalRef}
			snapPoints={snapPoints}
			onDismiss={onDismiss}
			backgroundStyle={modalBackgroundStyle}
			handleIndicatorStyle={modalHandleStyle}
			enablePanDownToClose={true}
			enableDismissOnClose={true}
			backdropComponent={renderBackdrop}
			enableDynamicSizing={false}
			accessible={false}
		>
			<View
				style={styles.searchContainer}
				testID="token-selection-modal-content"
				accessible={false}
			>
				<Searchbar
					testID="token-search-input"
					placeholder="Search tokens"
					value={searchQuery}
					onChangeText={handleSearchQueryChange}
					style={styles.searchBar}
					inputStyle={styles.searchBarInput}
					iconColor={styles.colors.onSurfaceVariant}
					placeholderTextColor={styles.colors.onSurfaceVariant}
					autoCapitalize="none"
					autoCorrect={false}
					autoFocus={false}
					submitBehavior={'blurAndSubmit'}
					returnKeyType="search"
					accessible={true}
					accessibilityRole="search"
					accessibilityLabel="Search for tokens"
					accessibilityHint="Type to filter available tokens"
				/>
			</View>
			<BottomSheetFlatList
				data={filteredCoins}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				contentContainerStyle={styles.tokenListContent}
				showsVerticalScrollIndicator={false}
				removeClippedSubviews={true}
				maxToRenderPerBatch={8}
				windowSize={8}
				initialNumToRender={8}
				updateCellsBatchingPeriod={50}
				getItemLayout={getItemLayout}
				accessible={false}
			/>
		</BottomSheetModal>
	);
};

const TokenSelector: React.FC<TokenSelectorProps> = ({
	selectedToken,
	onSelectToken,
	label,
	style: containerStyle, // Renamed from __style for clarity and applied to Card
	amountValue, // Crypto amount from parent
	onAmountChange, // Callback for crypto amount changes to parent
	isAmountEditable = true,
	isAmountLoading = false, // Loading state for crypto amount (e.g., quote fetching)
	showOnlyPortfolioTokens = false,
	testID,
	// New props for USD toggle
	enableUsdToggle = true, // Default to true as per new requirement
	// onUsdAmountChange removed from props
	initialInputUnit = 'CRYPTO',
	// Props for TextInput
	textInputProps = {},
}) => {
	testID = testID?.toLowerCase();
	const styles = useStyles();
	const [modalVisible, setModalVisible] = useState(false);
	const { tokens: portfolioTokens } = usePortfolioStore();

	// Internal state for USD toggle functionality
	const [currentInputUnit, setCurrentInputUnit] = useState<InputUnit>(initialInputUnit);
	const [internalUsdAmount, setInternalUsdAmount] = useState<string>('');
	// exchangeRate state is removed

	// Fetch/update coin data from store when selectedToken changes
	useEffect(() => {
		if (enableUsdToggle && selectedToken?.address) {
			// Fetch coin data, which includes price, and update the store
			// The component will react to store changes via useCoinStore selector below
			useCoinStore.getState().getCoinByID(selectedToken.address, true)
				.catch(error => logger.error('[TokenSelector] Failed to fetch coin data for price:', error));
		}
		// Reset unit and amounts if selectedToken is cleared
		if (!selectedToken) {
			setCurrentInputUnit('CRYPTO');
			setInternalUsdAmount('');
			if (onAmountChange) onAmountChange('');
		}
	}, [selectedToken, enableUsdToggle, onAmountChange]);

	// Get live coin data (including price) from the store
	const currentTokenDataFromStore = useCoinStore(state =>
		enableUsdToggle && selectedToken ? state.coinMap[selectedToken.address] : undefined
	);
	const liveExchangeRate = currentTokenDataFromStore?.price; // This is a number or undefined

	// Effect to update internal USD amount if crypto amountValue (from props) or liveExchangeRate changes
	// BUT only when we're NOT in USD input mode (to avoid overwriting user's USD input)
	useEffect(() => {
		if (enableUsdToggle && amountValue && currentInputUnit === 'CRYPTO') {
			const rate = liveExchangeRate;
			if (rate && rate > 0) {
				const crypto = parseFloat(amountValue);
				if (!isNaN(crypto)) {
					const newUsdVal = formatPrice(crypto * rate, false);
					setInternalUsdAmount(newUsdVal);
				} else {
					setInternalUsdAmount('');
				}
			} else {
				setInternalUsdAmount(''); // Clear if rate is invalid/zero or not available
			}
		} else if (enableUsdToggle && !amountValue) {
			setInternalUsdAmount('');
		}
	}, [amountValue, liveExchangeRate, enableUsdToggle]);

	const handleUnitToggle = useCallback(() => {
		setCurrentInputUnit(prevUnit => {
			const nextUnit = prevUnit === 'CRYPTO' ? 'USD' : 'CRYPTO';
			const rate = liveExchangeRate;

			if (rate && rate > 0) {
				if (prevUnit === 'CRYPTO' && amountValue) {
					// Switching from CRYPTO to USD - convert crypto amount to USD and preserve it
					const crypto = parseFloat(amountValue);
					if (!isNaN(crypto)) {
						const usdValue = formatPrice(crypto * rate, false);
						setInternalUsdAmount(usdValue);
						// Don't clear crypto amount - keep it for display as secondary value
					}
				} else if (prevUnit === 'USD' && internalUsdAmount) {
					// Switching from USD to CRYPTO - just preserve the original crypto input
					// Don't convert, just switch back to showing the original crypto amount
					// The crypto amount (amountValue) is already preserved from before
				}
			}

			return nextUnit;
		});
	}, [liveExchangeRate, amountValue, internalUsdAmount]);

	const handleCryptoAmountChange = useCallback((text: string) => {
		// Use validation function to ensure proper input formatting
		handleAmountInputChange(text, (validatedText: string) => {
			if (onAmountChange) onAmountChange(validatedText); // Update parent's crypto amount (which is amountValue)

			if (enableUsdToggle) {
				const rate = liveExchangeRate;
				if (validatedText && validatedText !== '.' && !validatedText.endsWith('.') && rate && rate > 0) {
					const crypto = parseFloat(validatedText);
					if (!isNaN(crypto)) {
						setInternalUsdAmount(formatPrice(crypto * rate, false));
					} else {
						setInternalUsdAmount('');
					}
				} else {
					setInternalUsdAmount('');
				}
			}
		});
	}, [onAmountChange, enableUsdToggle, liveExchangeRate]);

	const handleUsdAmountChange = useCallback((text: string) => {
		// Use validation function to ensure proper input formatting, just like crypto handler
		handleAmountInputChange(text, (validatedText: string) => {
			setInternalUsdAmount(validatedText); // Update internal USD amount - display exactly what user types

			// Convert USD to crypto for parent component, but don't format it
			if (enableUsdToggle && onAmountChange) {
				const rate = liveExchangeRate;
				if (validatedText && validatedText !== '.' && !validatedText.endsWith('.') && rate && rate > 0) {
					const usd = parseFloat(validatedText);
					if (!isNaN(usd)) {
						const cryptoValue = usd / rate;
						// Pass the converted crypto value to parent (this becomes the new amountValue)
						onAmountChange(cryptoValue.toString());
					} else {
						onAmountChange('');
					}
				} else {
					onAmountChange('');
				}
			}
		});
	}, [onAmountChange, enableUsdToggle, liveExchangeRate]);

	const displayAmount = useMemo(() => {
		if (enableUsdToggle && currentInputUnit === 'USD') {
			return internalUsdAmount;
		}
		// Format the crypto amount using our formatting utility
		if (amountValue && parseFloat(amountValue) > 0) {
			return formatTokenBalance(parseFloat(amountValue), 6);
		}
		return amountValue;
	}, [enableUsdToggle, currentInputUnit, internalUsdAmount, amountValue]);
	const currentAmountHandler = enableUsdToggle && currentInputUnit === 'USD' ? handleUsdAmountChange : handleCryptoAmountChange;

	const placeholder = useMemo(() => (enableUsdToggle && currentInputUnit === 'USD'
		? textInputProps?.placeholder ?? '$0.00'
		: textInputProps?.placeholder ?? '0.0000'),
		[enableUsdToggle, currentInputUnit, textInputProps?.placeholder]
	);

	const _portfolioToken = useMemo(() => {
		return findPortfolioToken(selectedToken, portfolioTokens);
	}, [selectedToken, portfolioTokens]);

	const handleDismiss = useCallback(() => setModalVisible(false), []);
	const activityIndicatorStyle = useMemo(() => ({ height: styles.amountInput.height }), [styles.amountInput.height]);
	const cardStyle = useMemo(() => [styles.cardContainer, containerStyle], [styles.cardContainer, containerStyle]);

	// Calculate display values for stacked layout
	const cryptoDisplayValue = useMemo(() => {
		if (!amountValue || parseFloat(amountValue) === 0) {
			return '0.0000'; // Show placeholder instead of empty string
		}
		const formattedAmount = formatTokenBalance(parseFloat(amountValue), 6);
		return formattedAmount;
	}, [amountValue]);

	const usdDisplayValue = useMemo(() => {
		if (!enableUsdToggle || !selectedToken) return '';
		const rate = liveExchangeRate;

		if (currentInputUnit === 'USD' && internalUsdAmount && parseFloat(internalUsdAmount) > 0) {
			return `$${formatPrice(parseFloat(internalUsdAmount), false)}`;
		} else if (currentInputUnit === 'CRYPTO' && amountValue && parseFloat(amountValue) > 0) {
			if (rate && rate > 0) {
				return `$${formatPrice(parseFloat(amountValue) * rate, false)}`;
			} else if (rate === undefined) {
				return '$...';
			} else {
				return '$0.00';
			}
		}
		return '$0.00'; // Always show placeholder value
	}, [enableUsdToggle, currentInputUnit, amountValue, internalUsdAmount, liveExchangeRate, selectedToken]);

	return (
		<>
			<Card elevation={0} style={cardStyle}>
				<Card.Content style={styles.cardContent}>
					{/* Main row: Token selector and amount input */}
					<View style={styles.mainRow}>
						{/* Token selector section */}
						<TouchableOpacity
							style={styles.tokenSelectorContainer}
							onPress={() => setModalVisible(true)}
							disabled={!onSelectToken}
							testID={testID}
							accessible={true}
							accessibilityRole="button"
							accessibilityLabel={selectedToken ? `Selected token: ${selectedToken.symbol.toLowerCase()}` : (label || "Select token")}
						>
							<View style={styles.tokenInfo}>
								{selectedToken?.logoURI ? (
									<>
										<RenderIcon iconUrl={selectedToken.logoURI} styles={styles} />
										<Text style={styles.tokenSymbol} testID={`${testID}-symbol`}>{selectedToken.symbol}</Text>
									</>
								) : (
									<Text style={styles.tokenSymbol} testID={`${testID}-label`}>{label || 'Select Token'}</Text>
								)}
							</View>
							<ChevronDownIcon size={16} color={styles.colors.onSurface} />
						</TouchableOpacity>

						{/* Amount input section */}
						{onAmountChange && (
							<View style={styles.amountInputContainer}>
								{isAmountLoading ? (
									<ActivityIndicator size="small" color={styles.colors.primary} style={activityIndicatorStyle} testID={`${testID}-loading-indicator`} />
								) : (
									<View style={styles.primaryValueContainer}>
										<TextInput
											testID={`${testID}-amount-input`}
											style={styles.primaryAmountInput}
											value={displayAmount || ''}
											onChangeText={currentAmountHandler}
											placeholder={placeholder}
											placeholderTextColor={styles.colors.onTertiaryContainer}
											keyboardType="decimal-pad"
											editable={isAmountEditable}
											{...textInputProps}
										/>
										{enableUsdToggle && selectedToken && (
											<TouchableOpacity
												onPress={handleUnitToggle}
												style={styles.swapButton}
												testID={`${testID}-swap-button`}
												accessible={true}
												accessibilityRole="button"
												accessibilityLabel="Toggle between crypto and USD input"
											>
												<ChangeIcon
													style={styles.swapIcon}
													size={16}
													color={styles.colors.onSurfaceVariant}
												/>
											</TouchableOpacity>
										)}
									</View>
								)}
							</View>
						)}
					</View>

					{/* Secondary row: Balance and USD/amount */}
					<View style={styles.secondaryRow}>
						{/* Balance section (left side) */}
						{selectedToken && _portfolioToken && (
							<View style={styles.balanceContainer}>
								<Text style={styles.tokenBalance} testID={`${testID}-balance`}>
									{formatTokenBalance(_portfolioToken.amount, 4)}
								</Text>
							</View>
						)}

						{/* USD/amount section (right side) */}
						{enableUsdToggle && selectedToken && onAmountChange && (
							<View style={styles.secondaryValueContainer}>
								<Text style={styles.secondaryValueText} testID={`${testID}-secondary-value`}>
									{currentInputUnit === 'CRYPTO' ? usdDisplayValue : cryptoDisplayValue}
								</Text>
							</View>
						)}
					</View>
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
