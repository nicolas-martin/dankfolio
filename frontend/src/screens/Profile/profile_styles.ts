import { StyleSheet } from 'react-native';
//TODO: Use theme where we can, but I don't know yet
import { theme } from '../../utils/theme';

export const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	centerContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 40,
	},
	errorText: {
		color: '#FF6B6B',
		fontSize: 18,
		textAlign: 'center',
		marginBottom: 10,
	},
	walletAddressText: {
		color: '#888',
		fontSize: 14,
		textAlign: 'center',
		marginTop: 10,
	},
	scrollView: {
		flex: 1,
	},
	header: {
		padding: 20,
		alignItems: 'center',
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 5,
	},
	subtitle: {
		fontSize: 16,
		color: '#888',
	},
	portfolioCard: {
		backgroundColor: '#1E1E1E',
		borderRadius: 12,
		padding: 16,
		marginHorizontal: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	portfolioTitle: {
		fontSize: 16,
		color: '#888',
		marginBottom: 10,
	},
	portfolioValue: {
		fontSize: 32,
		fontWeight: 'bold',
		color: '#fff',
	},
	portfolioBreakdown: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 20,
		paddingTop: 20,
		borderTopWidth: 1,
		borderTopColor: 'rgba(255, 255, 255, 0.1)',
	},
	breakdownItem: {
		flex: 1,
		alignItems: 'center',
	},
	breakdownDivider: {
		width: 1,
		height: '100%',
		backgroundColor: 'rgba(255, 255, 255, 0.1)',
		marginHorizontal: 15,
	},
	breakdownLabel: {
		fontSize: 14,
		color: '#888',
		marginBottom: 5,
	},
	breakdownValue: {
		fontSize: 16,
		color: '#fff',
		fontWeight: 'bold',
		marginBottom: 2,
	},
	breakdownUsd: {
		fontSize: 14,
		color: '#6A5ACD',
		fontWeight: '500',
	},
	tokensContainer: {
		padding: 20,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#FFFFFF',
		marginBottom: 16,
		textAlign: 'center',
	},
	emptyStateContainer: {
		padding: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyStateText: {
		color: '#888',
		fontSize: 16,
		textAlign: 'center',
	},
	tokenCard: {
		backgroundColor: '#2A2A3E',
		borderRadius: 15,
		padding: 15,
		marginBottom: 15,
	},
	tokenHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 15,
	},
	tokenHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	tokenLogo: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: 10,
	},
	tokenInfo: {
		flex: 1,
		gap: 4,
	},
	tokenSymbol: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#fff',
	},
	addressContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		opacity: 0.7,
	},
	addressText: {
		fontSize: 12,
		color: '#888',
		fontFamily: 'monospace',
	},
	copyIcon: {
		fontSize: 12,
	},
	tokenDetails: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	tokenDetail: {
		flex: 1,
		alignItems: 'center',
	},
	detailLabel: {
		fontSize: 12,
		color: '#888',
		marginBottom: 5,
	},
	detailValue: {
		fontSize: 14,
		color: '#fff',
		fontWeight: 'bold',
		textAlign: 'center',
	},
	loadingText: {
		color: '#fff',
		fontSize: 16,
		textAlign: 'center',
		marginBottom: 20,
	},
	tokensSection: {
		padding: 15,
	},
});
