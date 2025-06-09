import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, TouchableOpacity, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { Card, Text, useTheme, Searchbar } from 'react-native-paper';
import { BottomSheetModal, BottomSheetFlatList, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { ChevronDownIcon } from '@components/Common/Icons';
import { TokenSelectorProps, TokenSearchModalProps } from './types';
import { createStyles } from './styles';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { Coin } from '@/types';
import { calculateUsdValue, findPortfolioToken, handleAmountInputChange, useDebounce } from './scripts';
import { CachedImage } from '@/components/Common/CachedImage';

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
	const bottomSheetModalRef = useRef<BottomSheetModal>(null);
	const [searchQuery, setSearchQuery] = useState('');
	console.log('TokenSearchModal re-rendered. Search query:', searchQuery);
	const debouncedSearchQuery = useDebounce(searchQuery, 300);
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

	const baseList = useMemo(() => {
		return showOnlyPortfolioTokens
			? portfolioTokens.map(token => token.coin)
			: availableCoins;
	}, [showOnlyPortfolioTokens, portfolioTokens, availableCoins]);

	const filteredCoins = useMemo(() => {
		if (!debouncedSearchQuery) return baseList;

		return baseList.filter(coin =>
			coin.symbol.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
			coin.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
		);
	}, [baseList, debouncedSearchQuery]);

	useEffect(() => {
		console.log('filteredCoins reference changed');
	}, [filteredCoins]);

	const handleTokenSelect = useCallback((coin: Coin) => {
		onSelectToken(coin);
		onDismiss();
	}, [onSelectToken, onDismiss]);

	// Custom backdrop component with blur
	const renderBackdrop = useCallback((props: any) => (
		<BottomSheetBackdrop
			{...props}
			disappearsOnIndex={-1}
			appearsOnIndex={0}
			opacity={0.8}
			onPress={onDismiss}
		>
			<BlurView intensity={20} style={styles.blurView} />
		</BottomSheetBackdrop>
	), [onDismiss, styles.blurView]);

	// Inline component for rendering the icon using CachedImage
	const RenderIcon: React.FC<{ iconUrl: string | undefined }> = React.memo(({ iconUrl }) => {
		console.log('RenderIcon re-rendered. Icon URL:', iconUrl);
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

	// Memoized TokenItem component to prevent unnecessary re-renders
	const TokenItem: React.FC<{
		coin: Coin;
		portfolioToken: any;
		onSelect: (coin: Coin) => void;
		styles: any;
	}> = React.memo(({ coin, portfolioToken, onSelect, styles }) => {
		console.log('TokenItem re-rendered. Coin:', coin.symbol, 'Icon URL:', coin.resolvedIconUrl);
		const handlePress = useCallback(() => {
			onSelect(coin);
		}, [coin, onSelect]);

		return (
			<TouchableOpacity
				style={styles.tokenItem}
				onPress={handlePress}
			>
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
	});

	// Create a map for faster portfolio token lookup
	const portfolioTokenMap = useMemo(() => {
		const map = new Map();
		portfolioTokens.forEach((token: any) => {
			map.set(token.mintAddress, token);
		});
		return map;
	}, [portfolioTokens]);

	const renderItem = useCallback(({ item: coin }: { item: Coin }) => {
		console.log('renderItem. Coin:', coin.symbol, 'Icon URL:', coin.resolvedIconUrl);
		const portfolioToken = portfolioTokenMap.get(coin.mintAddress);
		return (
			<TokenItem
				coin={coin}
				portfolioToken={portfolioToken}
				onSelect={handleTokenSelect}
				styles={styles}
			/>
		);
	}, [handleTokenSelect, styles, portfolioTokenMap]);

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
		>
			<View style={styles.searchContainer}>
				<Searchbar
					placeholder="Search tokens"
					value={searchQuery}
					onChangeText={setSearchQuery}
					style={styles.searchBar}
					inputStyle={styles.searchBarInput}
					iconColor={theme.colors.onSurfaceVariant}
					placeholderTextColor={theme.colors.onSurfaceVariant}
					autoCapitalize="none"
					autoCorrect={false}
					autoFocus={false}
					blurOnSubmit={false}
					returnKeyType="search"
				/>
			</View>
			<BottomSheetFlatList
				data={filteredCoins}
				renderItem={renderItem}
				keyExtractor={coin => coin.mintAddress}
				contentContainerStyle={styles.tokenListContent}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				removeClippedSubviews={true}
				maxToRenderPerBatch={10}
				windowSize={10}
				initialNumToRender={10}
				getItemLayout={(data, index) => ({
					length: 72, // Approximate height of each token item
					offset: 72 * index,
					index,
				})}
			/>
		</BottomSheetModal>
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
	const amountPlaceholder = '0';
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
			<Card elevation={0} style={styles.cardContainer}>
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
								<>
									<TextInput
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
							{false && portfolioToken && (
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
