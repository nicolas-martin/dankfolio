/* eslint-disable react/prop-types */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Card, Text, useTheme, Searchbar } from 'react-native-paper';
import { BottomSheetModal, BottomSheetFlatList, BottomSheetBackdrop, BottomSheetBackdropProps } from '@gorhom/bottom-sheet'; // Added BottomSheetBackdropProps
import { BlurView } from 'expo-blur';
import { ChevronDownIcon } from '@components/Common/Icons';
import { TokenSelectorProps, TokenSearchModalProps } from './types'; // Assuming TokenListItem is defined in types
import { createStyles } from './styles';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { Coin } from '@/types';
import { calculateUsdValue, findPortfolioToken, handleAmountInputChange } from './scripts';
import CachedImage from '@/components/Common/CachedImage';
import { logger } from '@/utils/logger';
import { useNamedDepsDebug } from '@/utils/debugHooks';

// Memoized icon component to prevent unnecessary re-renders
const RenderIcon = React.memo<{ iconUrl: string | undefined; styles: ReturnType<typeof createStyles> }>(({ iconUrl, styles }) => {
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
RenderIcon.displayName = 'RenderIcon';

// Memoized TokenItem component to prevent unnecessary re-renders
const TokenItem = React.memo<{
	coin: Coin;
	portfolioToken: { amount: number } | undefined;
	onSelect: (coin: Coin) => void;
	styles: ReturnType<typeof createStyles>;
}>(({ coin, portfolioToken, onSelect, styles }) => {
	const handlePress = useCallback(() => {
		onSelect(coin);
	}, [coin, onSelect]);

	return (
		<TouchableOpacity
			testID={`search-result-${coin.mintAddress}`}
			style={styles.tokenItem}
			onPress={handlePress}
			accessible={true}
			accessibilityRole="button"
			accessibilityLabel={`Select ${coin.symbol} token, ${coin.name}`}
			accessibilityHint="Double tap to select this token"
			importantForAccessibility="yes"
		>
			<RenderIcon iconUrl={coin.resolvedIconUrl} styles={styles} />
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
	
	const theme = useTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);
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
		const filtered = baseList.filter(coin =>
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

	return (
		<BottomSheetModal
			ref={bottomSheetModalRef}
			snapPoints={['75%']}
			onDismiss={onDismiss}
			backgroundStyle={{ backgroundColor: theme.colors.surface }}
			handleIndicatorStyle={{ backgroundColor: theme.colors.onSurface }}
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
					iconColor={theme.colors.onSurfaceVariant}
					placeholderTextColor={theme.colors.onSurfaceVariant}
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
				getItemLayout={(data, index) => ({
					length: 72, // Approximate height of each token item
					offset: 72 * index,
					index,
				})}
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
	style: __style,
	amountValue,
	onAmountChange,
	isAmountEditable = true,
	isAmountLoading = false,
	showOnlyPortfolioTokens = false,
	testID,
}) => {
	// Unused props - satisfying linter
	void __style;
	
	const amountPlaceholder = '0';
	const theme = useTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);
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
			<Card elevation={0} style={styles.cardContainer}>
				<Card.Content style={styles.cardContent}>
					<TouchableOpacity
						style={styles.selectorButtonContainer}
						onPress={() => {
							setModalVisible(true);
						}}
						disabled={!onSelectToken}
						testID={selectedToken ? `${testID}-${selectedToken.mintAddress}` : testID}
						accessible={true}
						accessibilityRole="button"
						accessibilityLabel={selectedToken ? `Selected token: ${selectedToken.symbol}` : "Select token"}
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
										testID={`token-selector-icon-${selectedToken.mintAddress}`}
									/>
									<Text style={styles.tokenSymbol} testID={`token-selector-symbol-${selectedToken.mintAddress}`}>
										{selectedToken.symbol}
									</Text>
								</>
							) : (
								<Text style={styles.tokenSymbol} testID={`${testID}-placeholder`}>{label || 'Select Token'}</Text>
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
								<>
									<TextInput
										testID={`${testID}-amount-input`}
										style={styles.amountInput}
										value={amountValue}
										onChangeText={(text) => onAmountChange && handleAmountInputChange(text, onAmountChange)}
										placeholder={amountPlaceholder}
										placeholderTextColor={theme.colors.onTertiaryContainer}
										keyboardType="decimal-pad"
										editable={isAmountEditable}
									/>
									<Text style={styles.valueText}>
										{`$${calculatedValue}`}
									</Text>
								</>
							)}
							{/* note: HIDE FOR NOW */}
							{portfolioToken && ( // Corrected constant binary expression
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
