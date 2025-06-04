import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const App: React.FC = () => {
	return (
		<View style={styles.container}>
			<Text style={styles.text}>Hello World - App is working!</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#000',
	},
	text: {
		color: '#fff',
		fontSize: 18,
	},
});

export default App;
