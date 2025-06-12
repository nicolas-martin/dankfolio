import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		digitColumn: {
			alignItems: 'center',
			justifyContent: 'flex-start',
		},
		digitContainer: {
			overflow: 'hidden',
		},
		hidden: {
			left: -9999,
			opacity: 0,
			position: 'absolute',
		},
		row: {
			alignItems: 'center',
			flexDirection: 'row',
			justifyContent: 'flex-start',
			overflow: 'hidden',
		},
		separator: {
			alignSelf: 'flex-end',
		}
	})
	return {
		...styles,
		colors,
		theme
	};
};
