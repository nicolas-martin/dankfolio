import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper'; // Assuming MD3Theme is needed

// Copied from index.tsx
export const createStyles = (theme: MD3Theme) => StyleSheet.create({
  button: {
    alignSelf: 'center',
    padding: 12, // p="$3"
    marginVertical: 8, // my="$2"
    borderRadius: 999, // rounded="$full"
  },
}); 