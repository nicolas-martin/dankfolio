import { StyleSheet, Platform } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	aboutCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		marginBottom: 16,
		marginHorizontal: 16,
		padding: 20,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 8,
			},
			android: {
				elevation: 4,
			},
		}),
	},
	aboutHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 16,
	},
	aboutIcon: {
		alignItems: 'center',
		backgroundColor: theme.colors.secondaryContainer,
		borderRadius: 12,
		height: 24,
		justifyContent: 'center',
		marginRight: 12,
		width: 24,
	},
	aboutTitle: {
		color: theme.colors.onSurface,
		flex: 1,
		fontSize: 18,
		fontWeight: '600',
	},
	activityIndicatorContainer: { // New
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 8,
	},
	activityIndicatorOverlay: { // New
		alignItems: 'center',
		bottom: 0,
		justifyContent: 'center',
		left: 0,
		marginHorizontal: 16,
		marginVertical: 16,
		position: 'absolute',
		right: 0,
		top: 0,
	},
	centered: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
	},
	chartCardContent: { // New
		marginHorizontal: 16,
	},
	chartContainer: {
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		marginBottom: 16,
		marginHorizontal: 16,
		paddingVertical: 16,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 8,
			},
			android: {
				elevation: 4,
			},
		}),
	},
	coinInfoContainer: { // Legacy
		// This will be replaced by aboutCard
	},
	container: {
		backgroundColor: theme.colors.background,
		flex: 1,
	},
	content: {
		flex: 1,
	},
	flex1: { // New
		flex: 1,
	},
	flexDirectionRow: { // New
		flexDirection: 'row',
	},
	holdingsCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		marginBottom: 16,
		marginHorizontal: 16,
		padding: 20,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 8,
			},
			android: {
				elevation: 4,
			},
		}),
	},
	holdingsContainer: { // Legacy
		// This will be replaced by holdingsCard
	},
	holdingsContent: {
		gap: 12,
	},
	holdingsHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 16,
	},
	holdingsIcon: {
		alignItems: 'center',
		backgroundColor: theme.colors.primaryContainer,
		borderRadius: 12,
		height: 24,
		justifyContent: 'center',
		marginRight: 12,
		width: 24,
	},
	holdingsLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 15,
		fontWeight: '500',
	},
	holdingsRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 4,
	},
	holdingsTitle: {
		color: theme.colors.onSurface,
		flex: 1,
		fontSize: 18,
		fontWeight: '600',
	},
	holdingsValue: {
		color: theme.colors.onSurface,
		fontSize: 15,
		fontWeight: '600',
	},
	loadingChartText: { // New
		color: theme.colors.onSurfaceVariant,
		marginTop: 8,
	},
	loadingContainer: {
		alignItems: 'center',
		paddingVertical: 20,
	},
	loadingDetailsText: { // New
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
		marginTop: 8,
	},
	marginBottomL: { // New
		marginBottom: 16,
	},
	marginBottomM: { // New
		marginBottom: 8,
	},
	marginBottomS: { // New
		marginBottom: 4,
	},
	marginLeftS: { // New
		marginLeft: 8,
	},
	placeholderChartCardContainer: { // New
		marginHorizontal: 16,
		padding: 16,
	},
	placeholderIconShimmer: { // New
		marginRight: 12,
	},
	placeholderPadding: { // New
		padding: 16,
	},
	priceCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		marginBottom: 16,
		marginHorizontal: 16,
		padding: 20,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 8,
			},
			android: {
				elevation: 4,
			},
		}),
	},
	priceDisplayContainer: { // Legacy
		// This will be replaced by priceCard
	},
	scrollView: {
		flex: 1,
	},
	scrollViewContent: {
		paddingBottom: 100,
		paddingTop: 8,
	},
	timeframeButtonsContainer: { // Legacy
		// This will be replaced by timeframeCard
	},
	timeframeCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		marginBottom: 16,
		marginHorizontal: 16,
		padding: 12,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 8,
			},
			android: {
				elevation: 4,
			},
		}),
	},
	tradeButton: {
		borderRadius: 12,
		elevation: 10,
		paddingVertical: 4,
		shadowColor: '#00FF9F',
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.8,
		shadowRadius: 8,
	},
	tradeButtonContainer: {
		backgroundColor: theme.colors.surface,
		borderTopColor: theme.colors.outline,
		borderTopWidth: 1,
		bottom: 0,
		left: 0,
		paddingBottom: Platform.select({
			ios: 34, // Account for home indicator
			android: 16,
		}),
		paddingHorizontal: 16,
		paddingTop: 16,
		position: 'absolute',
		right: 0,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: -2 },
				shadowOpacity: 0.1,
				shadowRadius: 8,
			},
			android: {
				elevation: 8,
			},
		}),
	},
});
