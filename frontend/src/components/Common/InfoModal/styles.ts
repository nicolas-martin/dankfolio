import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '@/types/theme';

export const useStyles = () => {
  const theme = useTheme<AppTheme>();

  return StyleSheet.create({
    centeredView: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      flex: 1,
      justifyContent: 'center',
    },
    closeIcon: {
        color: theme.colors.onSurface,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 15,
      width: '100%',
    },
    modalText: {
      color: theme.colors.onSurface,
      marginBottom: 15,
      textAlign: 'left',
      lineHeight: 22,
    },
    modalTitle: {
      color: theme.colors.onSurface,
      fontSize: 20,
      fontWeight: 'bold',
    },
    modalView: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      elevation: 5,
      margin: 20,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    }
  });
};
