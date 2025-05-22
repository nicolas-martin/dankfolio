import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import styled from 'styled-components/native';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		backgroundColor: theme.colors.background,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 30,
		color: theme.colors.onBackground,
	},
	mnemonicInput: {
		height: 100,
		width: '100%',
		borderColor: theme.colors.outline,
		borderWidth: 1,
		borderRadius: 5,
		padding: 10,
		marginBottom: 15,
		textAlignVertical: 'top',
		color: theme.colors.onSurface,
		backgroundColor: theme.colors.surface,
	},
	errorText: {
		color: theme.colors.error,
		marginBottom: 15,
		textAlign: 'center',
	},
	orText: {
		marginVertical: 20,
		fontSize: 16,
		color: theme.colors.onSurfaceVariant,
	},
});

export const Container = styled.View`
	flex: 1;
	background-color: #FFFFFF;
`;

export const Section = styled.View`
	padding: 20px 16px 12px 16px;
	align-items: center;
`;

export const Title = styled.Text`
	font-family: 'Manrope';
	font-weight: 700;
	font-size: 28px;
	line-height: 35px;
	color: #1C170D;
	text-align: center;
`;

export const Subtitle = styled.Text`
	font-family: 'Manrope';
	font-weight: 400;
	font-size: 16px;
	line-height: 24px;
	color: #1C170D;
	text-align: center;
	margin-top: 8px;
`;

export const ButtonRow = styled.View`
	flex-direction: row;
	justify-content: space-between;
	margin: 24px 0 0 0;
`;

export const ActionButton = styled.TouchableOpacity<{bg?: string}>`
	flex: 1;
	background-color: ${({ bg }) => bg || '#F5C754'};
	border-radius: 24px;
	height: 48px;
	align-items: center;
	justify-content: center;
	margin: 0 8px;
`;

export const ButtonText = styled.Text`
	font-family: 'Manrope';
	font-weight: 700;
	font-size: 16px;
	color: #1C170D;
`;

export const TermsText = styled.Text`
	font-family: 'Manrope';
	font-weight: 400;
	font-size: 14px;
	color: #9C854A;
	text-align: center;
	margin-top: 24px;
`;

export const RecoveryInput = styled.TextInput`
	background-color: #FCFAF7;
	border: 1px solid #E8E0CF;
	border-radius: 12px;
	padding: 15px;
	font-size: 16px;
	color: #1C170D;
	margin: 16px 0;
`;

export const IconPlaceholder = styled.View`
	width: 48px;
	height: 48px;
	background-color: #F2F0E8;
	border-radius: 24px;
	align-items: center;
	justify-content: center;
	margin-bottom: 16px;
`; 