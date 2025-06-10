import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	alignFlexEnd: { // New
		alignItems: 'flex-end',
	},
	coinCardContainerStyle: {
		marginBottom: 12,
		paddingHorizontal: 16,
	},
	coinsList: {
		paddingBottom: 100,
	},
	coinsSection: {
		flex: 1,
		paddingHorizontal: 20,
		paddingTop: 20,
	},
	coinsSectionScrollView: {
		flex: 1,
	},
	connectButton: {
		backgroundColor: theme.colors.primary,
		borderRadius: 12,
		paddingHorizontal: 24,
		paddingVertical: 12,
	},
	connectButtonText: {
		color: theme.colors.onPrimary,
		fontSize: 16,
		fontWeight: '600',
	},
	container: {
		backgroundColor: theme.colors.background,
		flex: 1,
	},
	content: {
		flex: 1,
	},
	emptyStateContainer: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 40,
	},
	emptyStateIcon: {
		marginBottom: 16,
		opacity: 0.6,
	},
	emptyStateText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
	},
	emptyStateTitle: {
		color: theme.colors.onSurface,
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 8,
		textAlign: 'center',
	},
	flex1: { // New
		flex: 1,
	},
	headerContainer: {
		padding: 20,
		paddingBottom: 16,
	},
	loadingContainer: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'center',
		padding: 20,
	},
	loadingTrendingText: { // New
		color: theme.colors.onSurfaceVariant,
		marginTop: 8,
	},
	newCoinsPlaceholderCard: { // New
		backgroundColor: theme.colors.surface,
		borderRadius: 12,
		elevation: 2,
		height: 120,
		marginRight: 8,
		padding: 12,
		shadowColor: theme.colors.shadow,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		width: 140,
	},
	newCoinsPlaceholderContainer: { // New
		marginBottom: 24,
	},
	newCoinsPlaceholderIconShimmer: { // New
		alignSelf: 'center',
		marginBottom: 8,
	},
	newCoinsPlaceholderScrollContent: { // New
		paddingHorizontal: 16,
	},
	newCoinsPlaceholderText1Shimmer: { // New
		alignSelf: 'center',
		marginBottom: 4,
	},
	newCoinsPlaceholderText2Shimmer: { // New
		alignSelf: 'center',
	},
	newCoinsPlaceholderTitleContainer: { // New
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 16,
		paddingHorizontal: 16,
	},
	noWalletCard: {
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: 20,
		elevation: 4,
		padding: 32,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	noWalletContainer: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 40,
	},
	noWalletIcon: {
		marginBottom: 20,
		opacity: 0.7,
	},
	noWalletText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 24,
		textAlign: 'center',
	},
	noWalletTitle: {
		color: theme.colors.onSurface,
		fontSize: 20,
		fontWeight: '600',
		marginBottom: 8,
		textAlign: 'center',
	},
	placeholderCoinCardContainerMargin: { // New
		marginBottom: 12,
	},
	placeholderCoinCardContent: { // New
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: 12,
		elevation: 2,
		flexDirection: 'row',
		padding: 16,
		shadowColor: theme.colors.shadow,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
	},
	placeholderCoinIconShimmer: { // New
		marginRight: 12,
	},
	placeholderSparklineShimmer: { // New
		marginHorizontal: 12,
	},
	placeholderTextMarginBottomS: { // New
		marginBottom: 4,
	},
	sectionHeader: {
		marginBottom: 16,
		paddingHorizontal: 16,
	},
	sectionTitle: {
		color: theme.colors.onSurface,
		fontSize: 20,
		fontWeight: '600',
	},
	subtitleText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 16,
		fontWeight: '400',
	},
	welcomeText: {
		color: theme.colors.onSurface,
		fontSize: 28,
		fontWeight: '700',
		marginBottom: 4,
	},
});
