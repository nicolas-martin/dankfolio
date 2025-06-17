import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Card, Text, Searchbar, IconButton } from 'react-native-paper'; // Added IconButton
import { BottomSheetModal, BottomSheetFlatList, BottomSheetBackdrop, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { ChevronDownIcon } from '@components/Common/Icons';
import { TokenSelectorProps, TokenSearchModalProps } from './types';
import { useStyles } from './styles';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins'; // Already here, good.
import type { Coin } from '@/types';
import type { InputUnit } from '@/screens/Trade/types';
// calculateUsdValue might be removed if equivalentValueDisplay handles all formatting
import { findPortfolioToken } from './scripts'; // calculateUsdValue might be removed
import CachedImage from '@/components/Common/CachedImage';
import { logger } from '@/utils/logger';
import { useNamedDepsDebug } from '@/utils/debugHooks';
import { formatTokenBalance, formatPrice } from '@/utils/numberFormat'; // Added formatPrice import
// grpcApi import removed (no longer calling getUsdPrice directly)

// Memoized icon component to prevent unnecessary re-renders
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

	if (!coin.resolvedIconUrl) {
		logger.warn('TokenItem: Missing resolvedIconUrl for coin', coin.mintAddress);
		return
	}

	return (
		<TouchableOpacity
			testID={`search-result-${coin.symbol.toLowerCase()}`}
			style={styles.tokenItem}
			onPress={handlePress}
			accessible={true}
			accessibilityRole="button"
			accessibilityLabel={`Select ${coin.symbol.toLowerCase()} token, ${coin.name.toLowerCase()}`}
			accessibilityHint="Double tap to select this token"
			importantForAccessibility="yes"
		>
			<RenderIcon iconUrl={coin.resolvedIconUrl} styles={styles} />
			<View style={styles.tokenDetails}>
				<Text style={styles.tokenSymbol}>{coin.symbol}</Text>
				<Text style={styles.tokenName}>{coin.name}</Text>
				<Text style={styles.tokenAddress}>
					{coin.mintAddress ? `${coin.mintAddress.slice(0, 6)}...${coin.mintAddress.slice(-6)}` : 'N/A'}
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
	const { availableCoins } = useCoinStore();

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
		return showOnlyPortfolioTokens
			? portfolioTokens.map(token => token.coin)
			: availableCoins;
	}, [showOnlyPortfolioTokens, portfolioTokens, availableCoins]);

	// Optimized filtering with stable references to prevent flicker
	const filteredCoins = useMemo(() => {
		const maxResults = 100; // Limit for performance

		if (!searchQuery.trim()) {
			// Return first 50 coins when no search - stable reference
			return baseList.slice(0, 50);
		}

		const query = searchQuery.toLowerCase().trim();
		const filtered = baseList.filter((coin: Coin) =>
			coin.symbol.toLowerCase().includes(query) ||
			coin.name.toLowerCase().includes(query)
		);

		// Limit search results and ensure stable reference
		return filtered.slice(0, maxResults);
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
		const map = new Map<string, { mintAddress: string; amount: number; coin: Coin }>();
		portfolioTokens.forEach((token: { mintAddress: string; amount: number; coin: Coin }) => {
			map.set(token.mintAddress, token);
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
		const portfolioToken = portfolioTokenMap.get(coin.mintAddress);

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

	// Memoize key extractor
	const keyExtractor = useCallback((coin: Coin) => coin.mintAddress, []);

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
				importantForAccessibility="yes"
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
					importantForAccessibility="yes"
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
				importantForAccessibility="yes"
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
	helperText,
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
		if (enableUsdToggle && selectedToken?.mintAddress) {
			// Fetch coin data, which includes price, and update the store
			// The component will react to store changes via useCoinStore selector below
			useCoinStore.getState().getCoinByID(selectedToken.mintAddress, true)
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
		enableUsdToggle && selectedToken ? state.coinMap[selectedToken.mintAddress] : undefined
	);
	const liveExchangeRate = currentTokenDataFromStore?.price; // This is a number or undefined

	// Effect to update internal USD amount if crypto amountValue (from props) or liveExchangeRate changes
	useEffect(() => {
		if (enableUsdToggle && currentInputUnit === 'CRYPTO' && amountValue) {
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
		} else if (enableUsdToggle && currentInputUnit === 'CRYPTO' && !amountValue) {
			setInternalUsdAmount('');
		}
	}, [amountValue, liveExchangeRate, currentInputUnit, enableUsdToggle]);

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
	}, [onAmountChange, liveExchangeRate, amountValue, internalUsdAmount]);

	const handleCryptoAmountChange = useCallback((text: string) => {
		if (onAmountChange) onAmountChange(text); // Update parent's crypto amount (which is amountValue)

		if (enableUsdToggle) {
			const rate = liveExchangeRate;
			if (text && text !== '.' && !text.endsWith('.') && rate && rate > 0) {
				const crypto = parseFloat(text);
				if (!isNaN(crypto)) {
					setInternalUsdAmount(formatPrice(crypto * rate, false));
				} else {
					setInternalUsdAmount('');
				}
			} else {
				setInternalUsdAmount('');
			}
		}
	}, [onAmountChange, enableUsdToggle, liveExchangeRate]);

	const handleUsdAmountChange = useCallback((text: string) => {
		setInternalUsdAmount(text); // Update internal USD amount

		if (enableUsdToggle) {
			const rate = liveExchangeRate;
			if (text && text !== '.' && !text.endsWith('.') && rate && rate > 0) {
				const usd = parseFloat(text);
				if (!isNaN(usd)) {
					const cryptoValue = usd / rate;
					// Limit to 6 decimal places maximum for readability
					const formattedCrypto = cryptoValue.toFixed(6);
					// Remove trailing zeros
					const cleanCrypto = parseFloat(formattedCrypto).toString();
					if (onAmountChange) onAmountChange(cleanCrypto);
				} else {
					if (onAmountChange) onAmountChange('');
				}
			} else {
				if (onAmountChange) onAmountChange('');
			}
		}
	}, [onAmountChange, enableUsdToggle, liveExchangeRate]);

	const displayAmount = enableUsdToggle && currentInputUnit === 'USD' ? internalUsdAmount : amountValue;
	const currentAmountHandler = enableUsdToggle && currentInputUnit === 'USD' ? handleUsdAmountChange : handleCryptoAmountChange;

	const placeholder = useMemo(() => (enableUsdToggle && currentInputUnit === 'USD'
		? textInputProps?.placeholder ?? '$0.00'
		: textInputProps?.placeholder ?? `0.0000 ${selectedToken?.symbol || ''}`.trim()),
		[enableUsdToggle, currentInputUnit, textInputProps?.placeholder, selectedToken?.symbol]
	);

	const _portfolioToken = useMemo(() => {
		return findPortfolioToken(selectedToken, portfolioTokens);
	}, [selectedToken, portfolioTokens]);

	const handleDismiss = useCallback(() => setModalVisible(false), []);
	const activityIndicatorStyle = useMemo(() => ({ height: styles.amountInput.height }), [styles.amountInput.height]);

	// Calculate display values for stacked layout
	const cryptoDisplayValue = useMemo(() => {
		if (!amountValue || parseFloat(amountValue) === 0) return '';
		// Use formatTokenBalance utility for consistent formatting
		const formattedAmount = formatTokenBalance(parseFloat(amountValue), 6);
		return `${formattedAmount} ${selectedToken?.symbol || ''}`;
	}, [amountValue, selectedToken]);

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
				return '$-.--';
			}
		}
		return '';
	}, [enableUsdToggle, currentInputUnit, amountValue, internalUsdAmount, liveExchangeRate, selectedToken]);

	return (
		<>
			<Card elevation={0} style={[styles.cardContainer, containerStyle]}>
				<Card.Content style={styles.cardContent}>
					<View style={styles.leftSection}>
						<TouchableOpacity
							style={styles.tokenSelectorButton}
							onPress={() => setModalVisible(true)}
							disabled={!onSelectToken}
							testID={selectedToken ? `${testID}-${selectedToken.symbol.toLowerCase()}` : testID}
							accessible={true}
							accessibilityRole="button"
							accessibilityLabel={selectedToken ? `Selected token: ${selectedToken.symbol.toLowerCase()}` : (label || "Select token")}
						>
							<View style={styles.tokenInfo}>
								{selectedToken?.resolvedIconUrl ? (
									<>
										<RenderIcon iconUrl={selectedToken.resolvedIconUrl} styles={styles} />
										<Text style={styles.tokenSymbol} testID={`${testID}-symbol`}>{selectedToken.symbol}</Text>
									</>
								) : (
									<Text style={styles.tokenSymbol} testID={`${testID}-label`}>{label || 'Select Token'}</Text>
								)}
							</View>
							<ChevronDownIcon size={20} color={styles.colors.onSurface} />
						</TouchableOpacity>

						{/* Balance displayed below the selector button */}
						{selectedToken && _portfolioToken && (
							<Text style={styles.tokenBalance} testID={`${testID}-balance`}>
								{formatTokenBalance(_portfolioToken.amount, 4)}
							</Text>
						)}
					</View>

					{onAmountChange && (
						<View style={styles.rightSection}>
							{isAmountLoading ? (
								<ActivityIndicator size="small" color={styles.colors.primary} style={activityIndicatorStyle} testID={`${testID}-loading-indicator`} />
							) : (
								<View style={styles.stackedValuesContainer}>
									{/* Primary value (editable) */}
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
											<IconButton
												icon="currency-usd"
												size={16}
												iconColor={styles.colors.onSurfaceVariant}
												onPress={handleUnitToggle}
												style={styles.swapButton}
												testID={`${testID}-swap-button`}
											/>
										)}
									</View>

									{/* Secondary value (display only) */}
									{enableUsdToggle && selectedToken && (
										<Text style={styles.secondaryValueText} testID={`${testID}-secondary-value`}>
											{currentInputUnit === 'CRYPTO' ? usdDisplayValue : cryptoDisplayValue}
										</Text>
									)}
								</View>
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
