import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 30,
	},
	mnemonicInput: {
		height: 100,
		width: '100%',
		borderColor: 'gray',
		borderWidth: 1,
		borderRadius: 5,
		padding: 10,
		marginBottom: 15,
		textAlignVertical: 'top',
	},
	errorText: {
		color: 'red',
		marginBottom: 15,
		textAlign: 'center',
	},
	orText: {
		marginVertical: 20,
		fontSize: 16,
		color: 'grey',
	},
}); 